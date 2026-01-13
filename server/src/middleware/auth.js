import jwt from 'jsonwebtoken';

export function authRequired(req, res, next){
  const header = req.headers.authorization;
  if(!header) return res.status(401).json({error: 'Missing authorization header'});
  const token = header.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    req.user = payload;
    next();
  } catch(err){
    return res.status(401).json({error: 'Invalid token'});
  }
}

export function adminOnly(req, res, next){
  if(!req.user) return res.status(401).json({error: 'Unauthenticated'});
  if(req.user.role !== 'admin') return res.status(403).json({error: 'Forbidden'});
  next();
}
