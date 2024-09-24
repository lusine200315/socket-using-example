const mongoose = require('mongoose');

const uri = 'mongodb://localhost:27017/socket-data';

mongoose.connect(uri)
.then(() => {
  console.log('Connected to MongoDB successfully');
})
.catch((err) => {
  console.error('Error connecting to MongoDB:', err);
});
