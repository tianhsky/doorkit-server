// Load process.env from file
require('dotenv').load();

// Logger
var logger = require('./logger.js');
var log = logger();

// Socket
var express = require('express');
var io = require('socket.io');
var http = require('http');
var app = express();
var server = http.createServer(app);
var io = io.listen(server);
var port = process.env.PORT || 8080;
server.listen(port);

// Strat
log.info('App started');

/**
 * Upon client connected
 */
io.on('connection', function(socket) {
  log.info("Client connected", {
    socket_id: socket.id,
    ip: socket.handshake.address
  });

  /**
   * When broker identify itself, parse identity and put it into the right room
   *
   * @data {broker_id, client_type}
   */
  socket.on('client:connect', function(data) {
    log.info("Client connected with identity", data);
    if (data.broker_id && data.client_type) {
      // leave previous room if any
      if (socket.data && socket.data.broker_id) socket.leave(socket.data.broker_id);
      // join room
      socket.join(data.broker_id);
      // store identity
      socket.data = {
        broker_id: data.broker_id,
        client_type: data.client_type
      };
      // notify on success
      socket.emit("client:connected", data);
      // io.sockets.in(data.broker_id).emit('client:connected', data);
    } else {
      log.info('Unrecognized client', data);
    }
  });

  /**
   * Pass instruction to clients
   *
   * @data {object_type, object_id, action, meta}
   */
  socket.on('instruction', function(data) {
    var object_type = data.object_type;
    var action = data.action;
    if (object_type && action) {
      socket.broadcast.to(socket.data.broker_id).emit('instruction', data);
      log.info("Pass instruction to clients", data);
    } else {
      log.info("Invalid instruction", data);
    }
  });

  /**
   * Pass notification to clients
   *
   * @data {object_type, object_id, action, meta}
   */
  socket.on('notification', function(data) {
    var object_type = data.object_type;
    var action = data.action;
    if (object_type && action) {
      socket.broadcast.to(socket.data.broker_id).emit('notification', data);
      log.info("Pass notification to clients", data);
    } else {
      log.info("Invalid notification", data);
    }
  });

  /**
   * Socket disconnect handler
   */
  socket.on('disconnect', function() {
    var client = socket.data;
    if (client) {
      socket.leave(socket.data.broker_id);
      log.info("Client disconnected", socket.data);
    } else {
      log.info("Client disconnected", {
        socket_id: socket.id
      });
    }
  });
});

// Web Route
app.get('/', function(req, res) {
  res.send('Server Up!')
})