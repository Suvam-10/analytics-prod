const config = require("../config");
const redisClient = require("../redisClient");
const localStore = new Map();
function nowMs(){ return Date.now(); }
module.exports = function rateLimiter(req,res,next){
  const identifier = (req.header("x-api-key") || req.ip || "anon").toString();
  const windowMs = config.rateLimitWindowMs || 60000;
  const max = config.rateLimitMax || 1000;
  const key = `rl:${identifier}`;
  (async ()=>{
    try {
      if(redisClient && redisClient.isOpen){
        const cur = await redisClient.incr(key);
        if(cur === 1) await redisClient.pexpire(key, windowMs);
        if(cur > max) return res.status(429).json({ error: "Rate limit exceeded" });
        return next();
      } else {
        const entry = localStore.get(key) || { count:0, start: nowMs() };
        if(nowMs() - entry.start > windowMs){ entry.count=1; entry.start=nowMs(); } else entry.count++;
        localStore.set(key, entry);
        if(entry.count > max) return res.status(429).json({ error: "Rate limit exceeded" });
        return next();
      }
    } catch (err){
      console.warn("rateLimiter error:", err && err.message ? err.message : err);
      return next();
    }
  })();
};
