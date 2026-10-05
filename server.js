// =========================================
// SOVEREIGN MIND
// SERVER.JS - PostgreSQL
// =========================================

const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();

const PORT = process.env.PORT || 3000;


// =========================================
// POSTGRESQL
// =========================================

if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL n'est pas configurée.");
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});


// =========================================
// SITE
// =========================================

const publicFolder = __dirname;


// =========================================
// MIDDLEWARE
// =========================================

app.use(
    express.json({
        limit: "10mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb"
    })
);

app.use(express.static(publicFolder));


// =========================================
// BASE DE DONNÉES
// =========================================

async function initializeDatabase() {

    await pool.query(`
        CREATE TABLE IF NOT EXISTS bookings (
            id TEXT PRIMARY KEY,

            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,

            language TEXT DEFAULT 'fr',

            date TEXT NOT NULL,
            time TEXT NOT NULL,

            message TEXT DEFAULT '',

            payment_status TEXT DEFAULT 'pending',
            appointment_status TEXT DEFAULT 'pending',
            status TEXT DEFAULT 'pending',

            payment_proof TEXT,
            payment_reference TEXT DEFAULT '',

            payment_received_at TIMESTAMPTZ,
            confirmed_at TIMESTAMPTZ,
            rejected_at TIMESTAMPTZ,

            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    console.log("PostgreSQL: table bookings prête.");
}


// =========================================
// ID
// =========================================

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
// FORMAT RÉSERVATION
// =========================================

function formatBooking(row) {

    return {

        id: row.id,

        name: row.name,
        email: row.email,
        phone: row.phone,

        language: row.language,

        date: row.date,
        time: row.time,

        message: row.message,

        paymentStatus:
            row.payment_status,

        appointmentStatus:
            row.appointment_status,

        status:
            row.status,

        paymentProof:
            row.payment_proof,

        paymentReference:
            row.payment_reference,

        paymentReceivedAt:
            row.payment_received_at,

        confirmedAt:
            row.confirmed_at,

        rejectedAt:
            row.rejected_at,

        createdAt:
            row.created_at
    };
}


// =========================================
// HEALTH
// =========================================

app.get(
    "/health",
    async function (req, res) {

        try {

            await pool.query("SELECT 1");

            res.json({

                success: true,

                status: "ok",

                database: "connected"

            });

        } catch (error) {

            console.error(
                "Erreur PostgreSQL:",
                error
            );

            res.status(500).json({

                success: false,

                status: "error",

                database: "disconnected"

            });
        }
    }
);


// =========================================
// CRÉER UNE RÉSERVATION
// =========================================

app.post(
    "/api/bookings",
    async function (req, res) {

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


            const bookingId =
                createId();


            await pool.query(
                `
                INSERT INTO bookings (
                    id,
                    name,
                    email,
                    phone,
                    language,
                    date,
                    time,
                    message,
                    payment_status,
                    appointment_status,
                    status
                )

                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8,
                    'pending',
                    'pending',
                    'pending'
                )
                `,
                [

                    bookingId,

                    name,

                    email,

                    phone,

                    language || "fr",

                    date,

                    time,

                    message || ""

                ]
            );


            console.log("");
            console.log(
                "Nouvelle réservation :",
                bookingId
            );
            console.log("");


            return res.json({

                success: true,

                message:
                    "Réservation enregistrée.",

                bookingId:
                    bookingId

            });


        } catch (error) {

            console.error(
                "Erreur réservation:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Erreur lors de l'enregistrement."

            });

        }
    }
);


// =========================================
// COMPATIBILITÉ
// create-booking
// =========================================

app.post(
    "/api/create-booking",
    async function (req, res) {

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


            const bookingId =
                createId();


            await pool.query(
                `
                INSERT INTO bookings (
                    id,
                    name,
                    email,
                    phone,
                    language,
                    date,
                    time,
                    message
                )

                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8
                )
                `,
                [

                    bookingId,

                    name,

                    email,

                    phone,

                    language || "fr",

                    date,

                    time,

                    message || ""

                ]
            );


            console.log("");
            console.log(
                "Nouvelle réservation :",
                bookingId
            );
            console.log("");


            return res.json({

                success: true,

                message:
                    "Réservation enregistrée.",

                bookingId:
                    bookingId

            });


        } catch (error) {

            console.error(
                "Erreur create-booking:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Erreur lors de l'enregistrement."

            });

        }
    }
);


// =========================================
// PREUVE DE PAIEMENT
// =========================================

app.post(
    "/api/payment-proof",
    async function (req, res) {

        try {

            const {

                bookingId,

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


            let booking;


            // =================================
            // RECHERCHER PAR BOOKING ID
            // =================================

            if (bookingId) {

                const result =
                    await pool.query(
                        `
                        SELECT *
                        FROM bookings
                        WHERE id = $1
                        `,
                        [bookingId]
                    );


                if (result.rows.length > 0) {

                    booking =
                        result.rows[0];

                }

            }


            // =================================
            // RECHERCHE DE SECOURS
            // =================================

            if (!booking) {

                const result =
                    await pool.query(
                        `
                        SELECT *
                        FROM bookings

                        WHERE name = $1
                        AND email = $2
                        AND date = $3
                        AND time = $4

                        ORDER BY created_at DESC

                        LIMIT 1
                        `,
                        [

                            name,

                            email,

                            date,

                            time

                        ]
                    );


                if (result.rows.length > 0) {

                    booking =
                        result.rows[0];

                }

            }


            // =================================
            // SI PAS DE RÉSERVATION
            // =================================

            if (!booking) {

                const newId =
                    createId();


                await pool.query(
                    `
                    INSERT INTO bookings (
                        id,
                        name,
                        email,
                        phone,
                        language,
                        date,
                        time,
                        message
                    )

                    VALUES (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        $7,
                        $8
                    )
                    `,
                    [

                        newId,

                        name,

                        email,

                        phone,

                        language || "fr",

                        date,

                        time,

                        message || ""

                    ]
                );


                const result =
                    await pool.query(
                        `
                        SELECT *
                        FROM bookings
                        WHERE id = $1
                        `,
                        [newId]
                    );


                booking =
                    result.rows[0];

            }


            // =================================
            // ENREGISTRER LA PREUVE
            // =================================

            await pool.query(
                `
                UPDATE bookings

                SET

                    payment_proof = $1,

                    payment_reference = $2,

                    payment_status = 'verification',

                    appointment_status = 'pending',

                    status = 'pending',

                    payment_received_at = NOW()

                WHERE id = $3
                `,
                [

                    paymentProof,

                    paymentReference || "",

                    booking.id

                ]
            );


            console.log("");
            console.log(
                "Preuve de paiement reçue :",
                booking.id
            );
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
// LISTE DES RÉSERVATIONS
// =========================================

app.get(
    "/api/bookings",
    async function (req, res) {

        try {

            const result =
                await pool.query(
                    `
                    SELECT *
                    FROM bookings

                    ORDER BY created_at DESC
                    `
                );


            const bookings =
                result.rows.map(
                    formatBooking
                );


            res.json({

                success: true,

                count:
                    bookings.length,

                bookings:
                    bookings

            });


        } catch (error) {

            console.error(
                "Erreur lecture bookings:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Impossible de récupérer les réservations."

            });

        }
    }
);


// =========================================
// ACTION ADMIN
// =========================================

app.post(
    "/api/admin/booking-action",
    async function (req, res) {

        try {

            const index =
                Number(req.body.index);

            const action =
                req.body.action;


            if (
                !Number.isInteger(index) ||
                !["confirm", "reject"]
                    .includes(action)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Action invalide."

                });

            }


            const result =
                await pool.query(
                    `
                    SELECT *
                    FROM bookings

                    ORDER BY created_at DESC
                    `
                );


            if (!result.rows[index]) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Réservation introuvable."

                });

            }


            const booking =
                result.rows[index];


            // =================================
            // CONFIRMER
            // =================================

            if (action === "confirm") {

                await pool.query(
                    `
                    UPDATE bookings

                    SET

                        payment_status =
                            'verified',

                        appointment_status =
                            'confirmed',

                        status =
                            'confirmed',

                        confirmed_at =
                            NOW()

                    WHERE id = $1
                    `,
                    [booking.id]
                );

            }


            // =================================
            // REFUSER
            // =================================

            else {

                await pool.query(
                    `
                    UPDATE bookings

                    SET

                        payment_status =
                            'rejected',

                        appointment_status =
                            'rejected',

                        status =
                            'rejected',

                        rejected_at =
                            NOW()

                    WHERE id = $1
                    `,
                    [booking.id]
                );

            }


            const updated =
                await pool.query(
                    `
                    SELECT *
                    FROM bookings
                    WHERE id = $1
                    `,
                    [booking.id]
                );


            return res.json({

                success: true,

                message:
                    action === "confirm"

                        ? "Séance confirmée."

                        : "Paiement refusé.",

                booking:
                    formatBooking(
                        updated.rows[0]
                    )

            });


        } catch (error) {

            console.error(
                "Erreur action admin:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Erreur serveur."

            });

        }
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

async function startServer() {

    try {

        await initializeDatabase();


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
                    "PostgreSQL connected."
                );

                console.log("");

                console.log(
                    "Health check: /health"
                );

                console.log("");

                console.log(
                    "======================================="
                );

            }
        );


    } catch (error) {

        console.error("");

        console.error(
            "Impossible de démarrer le serveur:"
        );

        console.error(error);

        console.error("");

        process.exit(1);

    }
}


startServer();