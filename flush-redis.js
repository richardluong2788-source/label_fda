const Redis = require('ioredis');
require('dotenv').config(); // �?m b?o d?c du?c bi?n m�i tru?ng t? file .env

// L?y URL Redis t? .env (Uu ti�n c�c bi?n ph? bi?n c?a Upstash/Render)
const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;

if (!redisUrl) {
    console.error('? L?i: Kh�ng t�m th?y REDIS_URL trong file .env');
    process.exit(1);
}

const redis = new Redis(redisUrl);

console.log('?? �ang k?t n?i t?i Redis c?a Vexim Global...');

redis.flushall()
    .then(() => {
        console.log('? TH�NH C�NG: To�n b? Cache d� du?c x�a s?ch!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('? L?I khi x�a Redis:', err.message);
        process.exit(1);
    });