const jwt = require('jsonwebtoken');
module.exports = (req,res,next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).send({ message: 'Not authenticated' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.id;
    next();
  } catch(e) { return res.status(401).send({ message:'invalid token' }); }
};
