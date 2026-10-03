// =========================================
// SOVEREIGN MIND
// SERVER.JS
// =========================================

const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

const PORT = process.env.PORT || 3000;


// =========================================
// DOSSIERS
// =========================================
const publicFolder = __dirname;

const dataFolder =
    path.join(__dirname, "data");

const proofsFolder =
    path.join(dataFolder, "payment-proofs");


// Créer les dossiers automatiquement

if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, {
        recursive: true
    });
}


if (!fs.existsSync(proofsFolder)) {
    fs.mkdirSync(proofsFolder, {
        recursive: true
    });
}


// =========================================
// FICHIERS DE DONNÉES
// =========================================

const bookingsFile =
    path.join(
        dataFolder,
        "bookings.json"
    );


if (!fs.existsSync(bookingsFile)) {

    fs.writeFileSync(
        bookingsFile,
        "[]",
        "utf8"
    );

}


// =========================================
// MIDDLEWARE
// =========================================

app.use(
    express.json({
        limit: "1mb"
    })
);


app.use(
    express.urlencoded({
        extended: true,
        limit: "1mb"
    })
);


// =========================================
// SITE PUBLIC
// =========================================

app.use(
    express.static(publicFolder)
);


// =========================================
// FONCTIONS
// =========================================

function getBookings() {

    try {

        const content =
            fs.readFileSync(
                bookingsFile,
                "utf8"
            );

        return JSON.parse(content);

    } catch (error) {

        console.error(
            "Erreur lecture bookings:",
            error
        );

        return [];

    }

}


function saveBookings(bookings) {

    fs.writeFileSync(

        bookingsFile,

        JSON.stringify(
            bookings,
            null,
            2
        ),

        "utf8"

    );

}


function createId() {

    return (
        Date.now().toString(36) +
        "-" +
        Math.random()
            .toString(36)
            .substring(2, 8)
    );

}


// =========================================
// TEST SERVEUR
// =========================================

app.get(
    "/health",
    function (req, res) {

        res.json({

            success: true,

            message:
                "Sovereign Mind server is ready"

        });

    }
);


// =========================================
// CRÉER UNE RÉSERVATION
// =========================================

app.post(
    "/api/bookings",
    function (req, res) {

        try {

            const {

                name,
                email,
                phone,
                language,
                date,
                time,
                message

            } = req.body;


            // Vérification

            if (
                !name ||
                !email ||
                !phone ||
                !date ||
                !time
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Veuillez remplir tous les champs obligatoires."

                });

            }


            const bookings =
                getBookings();


            const booking = {

                id: createId(),

                name: name,

                email: email,

                phone: phone,

                language:
                    language || "fr",

                date: date,

                time: time,

                message:
                    message || "",

                paymentStatus:
                    "pending",

                appointmentStatus:
                    "pending",

                paymentProof:
                    null,

                paymentReference:
                    null,

                createdAt:
                    new Date().toISOString()

            };


            bookings.push(booking);


            saveBookings(bookings);


            console.log("");
            console.log(
                "Nouvelle réservation :"
            );
            console.log(booking);
            console.log("");


            return res.json({

                success: true,

                message:
                    "Réservation enregistrée.",

                bookingId:
                    booking.id

            });


        } catch (error) {

            console.error(error);


            return res.status(500).json({

                success: false,

                message:
                    "Erreur lors de l'enregistrement."

            });

        }

    }
);


// =========================================
// RECEVOIR LA PREUVE DE PAIEMENT
// =========================================
//
// NOTE : cette version reçoit la preuve
// sous forme Base64 depuis le navigateur.
// Elle sera enregistrée dans le dossier
// payment-proofs.
// =========================================

app.post(
    "/api/payment-proof",
    function (req, res) {

        try {

            const {

                name,
                email,
                phone,
                language,
                date,
                time,
                message,
                paymentName,
                paymentReference,
                paymentProof

            } = req.body;


            if (
                !name ||
                !email ||
                !phone ||
                !date ||
                !time ||
                !paymentName ||
                !paymentProof
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Informations de paiement incomplètes."

                });

            }


            const bookings =
                getBookings();


            // Chercher la réservation

            let booking =
                bookings.find(function (item) {

                    return (
                        item.name === name &&
                        item.email === email &&
                        item.date === date &&
                        item.time === time
                    );

                });


            // Si elle n'existe pas encore,
            // on la crée.

            if (!booking) {

                booking = {

                    id: createId(),

                    name: name,

                    email: email,

                    phone: phone,

                    language:
                        language || "fr",

                    date: date,

                    time: time,

                    message:
                        message || "",

                    paymentStatus:
                        "pending",

                    appointmentStatus:
                        "pending",

                    paymentProof:
                        null,

                    paymentReference:
                        null,

                    createdAt:
                        new Date().toISOString()

                };

                bookings.push(booking);

            }


            // =================================
            // TRAITEMENT DE LA PREUVE
            // =================================

            let proofData =
                paymentProof;


            let extension =
                "jpg";


            if (
                typeof proofData === "string" &&
                proofData.includes(",")
            ) {

                const parts =
                    proofData.split(",");

                proofData =
                    parts[1];


                const header =
                    parts[0];


                if (
                    header.includes("png")
                ) {

                    extension =
                        "png";

                }

                else if (
                    header.includes("jpeg")
                ) {

                    extension =
                        "jpg";

                }

            }


            const fileName =
                `${booking.id}.${extension}`;


            const filePath =
                path.join(
                    proofsFolder,
                    fileName
                );


            const imageBuffer =
                Buffer.from(
                    proofData,
                    "base64"
                );


            fs.writeFileSync(
                filePath,
                imageBuffer
            );


            // =================================
            // METTRE À JOUR LA RÉSERVATION
            // =================================

            booking.paymentProof =
                fileName;


            booking.paymentReference =
                paymentReference || "";


            booking.paymentStatus =
                "verification";


            booking.appointmentStatus =
                "pending";


            booking.paymentReceivedAt =
                new Date().toISOString();


            saveBookings(bookings);


            console.log("");
            console.log(
                "Preuve de paiement reçue :"
            );
            console.log(booking);
            console.log("");


            return res.json({

                success: true,

                message:
                    "Preuve de paiement reçue.",

                bookingId:
                    booking.id

            });


        } catch (error) {

            console.error(
                "Erreur paiement:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Impossible d'enregistrer la preuve de paiement."

            });

        }

    }
);


// =========================================
// TABLEAU DES RÉSERVATIONS
// =========================================
//
// Pour le moment cette route est locale.
// Nous construirons l'accès administrateur
// sécurisé ensuite.
// =========================================

app.get(
    "/api/bookings",
    function (req, res) {

        const bookings =
            getBookings();


        res.json({

            success: true,

            count:
                bookings.length,

            bookings:
                bookings

        });

    }
);


// =========================================
// PAGE PRINCIPALE
// =========================================

app.get(
    "/",
    function (req, res) {

        res.sendFile(
            path.join(
                publicFolder,
                "index.html"
            )
        );

    }
);


// ==========================================
// ADMIN - CONFIRMER / REFUSER UNE RESERVATION
// ==========================================


app.post("/api/admin/booking-action", function (req, res) {

    try {

        const index = Number(req.body.index);
        const action = req.body.action;

        if (
            !Number.isInteger(index) ||
            !["confirm", "reject"].includes(action)
        ) {
            return res.status(400).json({
                success: false,
                message: "Action invalide."
            });
        }

        if (!fs.existsSync(bookingsFile)) {
            return res.status(404).json({
                success: false,
                message: "Fichier bookings.json introuvable."
            });
        }

        const bookings = JSON.parse(
            fs.readFileSync(bookingsFile, "utf8")
        );

        if (!Array.isArray(bookings) || !bookings[index]) {
            return res.status(404).json({
                success: false,
                message: "Réservation introuvable."
            });
        }

        const booking = bookings[index];

        if (action === "confirm") {

            booking.paymentStatus = "verified";
            booking.appointmentStatus = "confirmed";
            booking.status = "confirmed";
            booking.confirmedAt = new Date().toISOString();

        } else if (action === "reject") {

            booking.paymentStatus = "rejected";
            booking.appointmentStatus = "rejected";
            booking.status = "rejected";
            booking.rejectedAt = new Date().toISOString();

        }

        fs.writeFileSync(
            bookingsFile,
            JSON.stringify(bookings, null, 2),
            "utf8"
        );

        return res.json({
            success: true,
            message:
                action === "confirm"
                    ? "Séance confirmée."
                    : "Paiement refusé.",
            booking: booking
        });

    } catch (error) {

        console.error(
            "Erreur action administrateur :",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Erreur serveur."
        });
    }

});


// =========================================
// ROUTE INCONNUE
// =========================================



app.use(
    function (req, res) {

        res.status(404).json({

            success: false,

            message:
                "Route not found"

        });

    }
);


// =========================================
// DÉMARRAGE
// =========================================
app.listen(
    PORT,
    function () {

        console.log("");

        console.log(
            "======================================="
        );

        console.log(
            "       SOVEREIGN MIND SERVER"
        );

        console.log(
            "======================================="
        );

        console.log("");

        console.log(
            `Server running on http://localhost:${PORT}`
        );

        console.log("");

        console.log(
            `Health check: http://localhost:${PORT}/health`
        );

        console.log("");

        console.log(
            "======================================="
        );

    }
);
