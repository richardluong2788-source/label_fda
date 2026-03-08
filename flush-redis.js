const Redis = require('ioredis');
require('dotenv').config(); // Ð?m b?o d?c du?c bi?n môi tru?ng t? file .env

// L?y URL Redis t? .env (Uu tiên các bi?n ph? bi?n c?a Upstash/Render)
const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;

if (!redisUrl) {
    console.error('? L?i: Không tìm th?y REDIS_URL trong file .env');
    process.exit(1);
}

const redis = new Redis(redisUrl);

console.log('?? Ðang k?t n?i t?i Redis c?a Vexim Global...');

redis.flushall()
    .then(() => {
        console.log('? THÀNH CÔNG: Toàn b? Cache dã du?c xóa s?ch!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('? L?I khi xóa Redis:', err.message);
        process.exit(1);
    });