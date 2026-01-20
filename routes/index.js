const configureRoutes = (app) => {
  app.use('/api/auth', require('./api/auth'));
  app.use('/api/users', require('./api/users'));
  app.use('/api/chips', require('./api/chips'));
  
  // Bot management routes
  const { router: botRouter } = require('./api/bots');
  app.use('/api/bots', botRouter);
  
  // Tournament management routes
  const { router: tournamentRouter } = require('./api/tournaments');
  app.use('/api/tournaments', tournamentRouter);
  
  app.use('/', (req, res) => {
    res.status(200).send('GGLab API Documents');
  });
};

module.exports = configureRoutes;  