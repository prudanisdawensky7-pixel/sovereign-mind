// =========================================
// SOVEREIGN MIND
// SCRIPT.JS
// =========================================


// =========================================
// ANNÉE
// =========================================

const yearElement = document.getElementById("year");

if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
}


// =========================================
// LANGUES
// =========================================

const frBtn = document.getElementById("frBtn");
const enBtn = document.getElementById("enBtn");

function changeLanguage(language) {

    const elements =
        document.querySelectorAll("[data-fr][data-en]");

    elements.forEach(function (element) {

        const text =
            element.getAttribute("data-" + language);

        if (text) {
            element.textContent = text;
        }

    });

    document.documentElement.lang = language;
}


if (frBtn) {

    frBtn.addEventListener("click", function () {
        changeLanguage("fr");
    });

}


if (enBtn) {

    enBtn.addEventListener("click", function () {
        changeLanguage("en");
    });

}


changeLanguage("fr");


// =========================================
// ÉLÉMENTS
// =========================================

const bookingForm =
    document.getElementById("bookingForm");

const paymentSection =
    document.getElementById("payment");

const paymentForm =
    document.getElementById("paymentForm");

const confirmationSection =
    document.getElementById("confirmation");

const formMessage =
    document.getElementById("formMessage");

const paymentMessage =
    document.getElementById("paymentMessage");

const bookingSummary =
    document.getElementById("bookingSummary");


// =========================================
// RÉSERVATION ACTUELLE
// =========================================

let currentBooking = null;


// =========================================
// RÉSERVATION
// =========================================

if (bookingForm) {

    bookingForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            if (formMessage) {
                formMessage.textContent =
                    "Enregistrement de votre réservation...";
            }


            const name =
                document
                    .getElementById("clientName")
                    .value
                    .trim();

            const email =
                document
                    .getElementById("clientEmail")
                    .value
                    .trim();

            const phone =
                document
                    .getElementById("clientPhone")
                    .value
                    .trim();

            const language =
                document
                    .getElementById("sessionLanguage")
                    .value;

            const date =
                document
                    .getElementById("appointmentDate")
                    .value;

            const time =
                document
                    .getElementById("appointmentTime")
                    .value;

            const message =
                document
                    .getElementById("message")
                    .value
                    .trim();


            if (
                !name ||
                !email ||
                !phone ||
                !date ||
                !time
            ) {

                if (formMessage) {

                    formMessage.textContent =
                        "Veuillez remplir tous les champs obligatoires.";

                }

                return;
            }


            currentBooking = {

                name: name,

                email: email,

                phone: phone,

                language: language,

                date: date,

                time: time,

                message: message

            };


            try {

                const response =
                    await fetch(
                        "/api/bookings",
                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify(
                                    currentBooking
                                )

                        }
                    );


                const data =
                    await response.json();


                if (!response.ok || !data.success) {

                    throw new Error(
                        data.message ||
                        "Erreur de réservation."
                    );

                }


                currentBooking.bookingId =
                    data.bookingId;


                if (paymentSection) {

                    paymentSection.classList.remove(
                        "hidden"
                    );


                    paymentSection.scrollIntoView({

                        behavior: "smooth",

                        block: "start"

                    });

                }


                if (formMessage) {

                    formMessage.textContent =
                        "Réservation enregistrée. Effectuez maintenant le paiement NatCash.";

                }


            } catch (error) {

                console.error(error);

                if (formMessage) {

                    formMessage.textContent =
                        "Impossible d'enregistrer la réservation. Vérifiez que le serveur est lancé.";

                }

            }

        }
    );

}


// =========================================
// CONVERSION IMAGE → BASE64
// =========================================

function convertImageToBase64(file) {

    return new Promise(function (resolve, reject) {

        const reader =
            new FileReader();


        reader.onload = function () {

            resolve(reader.result);

        };


        reader.onerror = function () {

            reject(
                new Error(
                    "Impossible de lire l'image."
                )
            );

        };


        reader.readAsDataURL(file);

    });

}


// =========================================
// PREUVE DE PAIEMENT
// =========================================

if (paymentForm) {

    paymentForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            if (!currentBooking) {

                if (paymentMessage) {

                    paymentMessage.textContent =
                        "Veuillez d'abord effectuer une réservation.";

                }

                return;

            }


            const paymentName =
                document
                    .getElementById("paymentName")
                    .value
                    .trim();


            const paymentReference =
                document
                    .getElementById("paymentReference")
                    .value
                    .trim();


            const paymentProof =
                document
                    .getElementById("paymentProof")
                    .files[0];


            if (!paymentName || !paymentProof) {

                if (paymentMessage) {

                    paymentMessage.textContent =
                        "Veuillez indiquer votre nom et sélectionner votre preuve de paiement.";

                }

                return;

            }


            if (!paymentProof.type.startsWith("image/")) {

                if (paymentMessage) {

                    paymentMessage.textContent =
                        "Veuillez sélectionner une image.";

                }

                return;

            }


            if (paymentProof.size > 5 * 1024 * 1024) {

                if (paymentMessage) {

                    paymentMessage.textContent =
                        "La preuve doit faire moins de 5 MB.";

                }

                return;

            }


            if (paymentMessage) {

                paymentMessage.textContent =
                    "Envoi de votre preuve de paiement...";

            }


            try {

                const proofBase64 =
                    await convertImageToBase64(
                        paymentProof
                    );


                const paymentData = {

                    bookingId:
                        currentBooking.bookingId,

                    name:
                        currentBooking.name,

                    email:
                        currentBooking.email,

                    phone:
                        currentBooking.phone,

                    language:
                        currentBooking.language,

                    date:
                        currentBooking.date,

                    time:
                        currentBooking.time,

                    message:
                        currentBooking.message,

                    paymentName:
                        paymentName,

                    paymentReference:
                        paymentReference,

                    paymentProof:
                        proofBase64

                };


                const response =
                    await fetch(
                        "/api/payment-proof",
                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify(
                                    paymentData
                                )

                        }
                    );


                const data =
                    await response.json();


                if (!response.ok || !data.success) {

                    throw new Error(
                        data.message ||
                        "Erreur pendant l'envoi."
                    );

                }


                // =================================
                // CONFIRMATION
                // =================================

                if (confirmationSection) {

                    confirmationSection.classList.remove(
                        "hidden"
                    );


                    confirmationSection.scrollIntoView({

                        behavior: "smooth",

                        block: "start"

                    });

                }


                if (bookingSummary) {

                    bookingSummary.innerHTML = `

                        <p>
                            <strong>Nom :</strong>
                            ${escapeHTML(currentBooking.name)}
                        </p>

                        <p>
                            <strong>Date :</strong>
                            ${escapeHTML(currentBooking.date)}
                        </p>

                        <p>
                            <strong>Heure :</strong>
                            ${escapeHTML(currentBooking.time)}
                        </p>

                        <p>
                            <strong>Statut :</strong>
                            Paiement reçu — vérification en cours
                        </p>

                    `;

                }


                if (paymentMessage) {

                    paymentMessage.textContent =
                        "Votre preuve de paiement a bien été reçue. Nous allons vérifier votre paiement et vous contacter pour confirmer votre séance.";

                }


                const paymentButton =
                    document.getElementById(
                        "paymentButton"
                    );


                if (paymentButton) {

                    paymentButton.disabled =
                        true;

                    paymentButton.textContent =
                        "Preuve envoyée ✓";

                }


            } catch (error) {

                console.error(error);


                if (paymentMessage) {

                    paymentMessage.textContent =
                        "Une erreur est survenue pendant l'envoi. Vérifiez que le serveur est lancé.";

                }

            }

        }
    );

}


// =========================================
// PROTECTION HTML
// =========================================

function escapeHTML(text) {

    return String(text)

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&#039;");

}


// =========================================
// DATE MINIMUM
// =========================================

const appointmentDate =
    document.getElementById(
        "appointmentDate"
    );


if (appointmentDate) {

    const today =
        new Date();


    const year =
        today.getFullYear();


    const month =
        String(
            today.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            today.getDate()
        ).padStart(2, "0");


    appointmentDate.min =
        `${year}-${month}-${day}`;

}