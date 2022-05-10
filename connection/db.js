// import pg package
const { Pool } = require('pg');

const dbPool = new Pool({
  database: 'my-project',
  port: 5432,
  user: 'postgres',
  password: 'd62878891354',
});

//export dbPool
module.exports = dbPool;
