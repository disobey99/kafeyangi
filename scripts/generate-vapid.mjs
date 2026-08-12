import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("Quyidagilarni .env fayliga qo'shing:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${keys.publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${keys.privateKey}"`);
console.log(`VAPID_SUBJECT="mailto:admin@kafe.uz"`);
