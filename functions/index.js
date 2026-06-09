const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();
const db = admin.firestore();

// Helper: Calculate days since last vote date (YYYY-MM-DD)
function getDaysIdle(lastVoteDateStr) {
    if (!lastVoteDateStr) return 999;
    const lastVote = new Date(lastVoteDateStr);
    const now = new Date();
    lastVote.setHours(0,0,0,0);
    now.setHours(0,0,0,0);
    const diffTime = Math.abs(now - lastVote);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Helper: Call WhatsApp Business Cloud API
async function triggerWhatsAppCloudAPI(phoneId, accessToken, recipientPhone, templateName, templateLang, userName, daysIdle) {
    let formattedPhone = recipientPhone.replace(/[^0-9]/g, "");
    if (formattedPhone.length === 10) {
        formattedPhone = "91" + formattedPhone;
    }

    const cleanDaysIdle = daysIdle === 999 ? "many" : String(daysIdle);

    const payload = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "template",
        template: {
            name: templateName,
            language: { code: templateLang || "en_US" }
        }
    };

    if (templateName !== "hello_world") {
        payload.template.components = [
            {
                type: "body",
                parameters: [
                    { type: "text", text: userName },
                    { type: "text", text: cleanDaysIdle }
                ]
            }
        ];
    }

    const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || "WhatsApp API Error");
    }
    return data;
}

/**
 * Scheduled Cloud Function running daily to scan and send reminders
 */
exports.dailyWhatsAppReminder = functions.pubsub
    .schedule("0 9 * * *") // Runs every day at 09:00 AM UTC
    .timeZone("Asia/Kolkata")
    .onRun(async (context) => {
        console.log("Starting daily WhatsApp reminder check...");

        try {
            // 1. Fetch API settings
            const configDoc = await db.collection("settings").doc("whatsapp").get();
            if (!configDoc.exists) {
                console.log("WhatsApp Business API settings not configured. Aborting job.");
                return null;
            }

            const config = configDoc.data();
            if (!config.phoneId || !config.accessToken || !config.templateName) {
                console.log("WhatsApp API configs are incomplete. Aborting job.");
                return null;
            }

            // 2. Fetch all users and logs
            const usersSnap = await db.collection("users").get();
            const logsSnap = await db.collection("whatsapp_logs").get();

            // Cooldown map: phone -> last sent timestamp
            const lastReminderMap = {};
            logsSnap.forEach(d => {
                const log = d.data();
                if (log.phone && log.sentAt) {
                    const sentTime = new Date(log.sentAt).getTime();
                    if (!lastReminderMap[log.phone] || sentTime > lastReminderMap[log.phone]) {
                        lastReminderMap[log.phone] = sentTime;
                    }
                }
            });

            const nowMs = Date.now();
            let processed = 0;
            let failed = 0;

            for (const doc of usersSnap.docs) {
                const userData = doc.data();
                const userPhone = String(userData.phone || "").trim();
                const lastVoteDate = userData.lastVoteDate || "";
                const daysIdle = getDaysIdle(lastVoteDate);

                // Check if user is active (7+ days idle)
                if (daysIdle >= 7 && userData.role !== "admin" && userPhone) {
                    const lastSentTime = lastReminderMap[userPhone];
                    const hoursSinceLast = lastSentTime ? (nowMs - lastSentTime) / (1000 * 60 * 60) : Infinity;

                    // 24-hour duplicate check
                    if (hoursSinceLast >= 24) {
                        const logRef = await db.collection("whatsapp_logs").add({
                            userId: doc.id,
                            phone: userPhone,
                            name: userData.name || "Unknown",
                            templateName: config.templateName,
                            sentAt: new Date().toISOString(),
                            status: "sending",
                            error: ""
                        });

                        try {
                            await triggerWhatsAppCloudAPI(
                                config.phoneId,
                                config.accessToken,
                                userPhone,
                                config.templateName,
                                config.templateLang,
                                userData.name || "Unknown",
                                daysIdle
                            );
                            await logRef.update({ status: "delivered", error: "Delivered successfully" });
                            processed++;
                        } catch (err) {
                            console.error(`Failed to send automated reminder to ${userPhone}:`, err);
                            await logRef.update({ status: "failed", error: err.message });
                            failed++;
                        }
                    }
                }
            }

            console.log(`Daily reminder process completed. Processed: ${processed}, Failed: ${failed}`);
            return null;
        } catch (e) {
            console.error("Scheduled WhatsApp reminder error:", e);
            return null;
        }
    });
