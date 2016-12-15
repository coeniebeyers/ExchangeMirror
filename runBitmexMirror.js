var WebSocket = require('ws');
var http = require('http');
var events = require('./eventEmitter.js');

var orderBook = [];
var operations = 0;
var account = null;

var options = {
  host: 'localhost',
  port: 3033,
};

callback = function(response) {
  /*var str = '';

  response.on('data', function (chunk) {
    str += chunk;
  });

  response.on('end', function () {
    console.log(str);
  });*/
};

events.on('submitOrder', function(order){
  var path = '/submitOrder?'
  //console.log('submitOrder:', order);
  path += 'timestamp='+new Date().getTime();
  path += '&id='+order.id;
  path += '&accountId='+account.id;
  if(order.side == 'Sell'){
    path += '&type='+'ask';
  } else {
    path += '&type='+'bid';
  }
  path += '&price='+order.price;
  path += '&amount='+order.size;
  options.path = path;
  http.request(options, callback).end();
  operations++;
});

events.on('cancelOrder', function(order){
  //console.log('cancelOrder:', order);
  var path = '/submitOrder?'
  //console.log('submitOrder:', order);
  path += 'timestamp='+new Date().getTime();
  path += '&id='+order.id;
  path += '&accountId='+account.id;
  if(order.side == 'Sell'){
    path += '&type='+'cancelask';
  } else {
    path += '&type='+'cancelbid';
  }
  path += '&price='+order.price;
  path += '&amount='+order.size;
  options.path = path;
  http.request(options, callback).end();
  operations++;
});

events.on('updateOrder', function(order){
  //console.log('cancelOrder:', order);
  var path = '/submitOrder?'
  //console.log('submitOrder:', order);
  path += 'timestamp='+new Date().getTime();
  path += '&id='+order.id;
  path += '&accountId='+account.id;
  if(order.side == 'Sell'){
    path += '&type='+'updateask';
  } else {
    path += '&type='+'updatebid';
  }
  path += '&price='+order.price;
  path += '&amount='+order.size;
  options.path = path;
  http.request(options, callback).end();
  operations++;
});

events.on('tradeInsert', function(tradeData){
  for(var i in tradeData){
    console.log('Trade:', tradeData[i]);
    events.emit('submitOrder', tradeData[i]);
  }
});

events.on('orderBookInsert', function(orderBookData){
  //console.log('orderBookInsert:', orderBookData);
  for(var i in orderBookData){
    events.emit('submitOrder', orderBookData[i]);     
    orderBook[orderBookData[i].id] = orderBookData[i];
  }
});

events.on('orderBookDelete', function(orderBookData){
  //console.log('orderBookDelete:', orderBookData);
  for(var i in orderBookData){
    events.emit('cancelOrder', orderBook[orderBookData[i].id]);
    delete orderBook[orderBookData[i].id];
  }
});

events.on('orderBookUpdate', function(orderBookData){
  //console.log('orderBookUpdate:', orderBookData);
  for(var i in orderBookData){
    events.emit('updateOrder', orderBookData[i]);
    orderBook[orderBookData[i].id].size = orderBookData[i].size;
  }
});

events.on('partialOrderBookData', function(orderBookData){
  for(var i in orderBookData){
    events.emit('submitOrder', orderBookData[i]);     
    orderBook[orderBookData[i].id] = orderBookData[i];
  }
});

events.on('trade', function(message){
  operations++;
  if(message && message.action == 'insert'){
    events.emit('tradeInsert', message.data);
  } else {
    console.log('Unhandled trade', message);
  }
});

events.on('orderBookL2', function(message){
  if(message && message.action == 'partial'){
    events.emit('partialOrderBookData', message.data);
  } else if (message && message.action == 'insert'){
    events.emit('orderBookInsert', message.data);
  } else if (message && message.action == 'delete'){
    events.emit('orderBookDelete', message.data);
  } else if (message && message.action == 'update'){
    events.emit('orderBookUpdate', message.data);
  } else {
    console.log('Unhandled orderBookL2:', message);
  }
});

events.on('newMessage', function(message){
  if(message && message.table == 'orderBookL2'){
    events.emit('orderBookL2', message);
  } else if(message && message.table == 'trade'){
    events.emit('trade', message);
  } else {
    console.log('Unhandled message:', message);
  } 
});

function getBalances(accountId, cb){
  var path = '/getBalance?accountId='+accountId
  options.path = path;
  http.request(options, function(response) {
    var str = '';

    response.on('data', function (chunk) {
      str += chunk;
    });

    response.on('end', function () {
      var balances = JSON.parse(str);
      cb(balances);
    });
  }).end();
}

function getAccountId(cb){
  var path = '/createNewAccount'
  options.path = path;
  http.request(options, function(response) {
    var str = '';

    response.on('data', function (chunk) {
      str += chunk;
    });

    response.on('end', function () {
      var account_ = JSON.parse(str);
      cb(account_);
    });
  }).end();
}

function adjustBalance(obj, cb){
  var path = '/adjustAccountBalance';
  path += '?accountId='+obj.accountId;
  path += '&amount='+obj.amount;
  path += '&currency='+obj.currency;
  options.path = path;
  http.request(options, function(response) {
    var str = '';

    response.on('data', function (chunk) {
      str += chunk;
    });

    response.on('end', function () {
      var balances = JSON.parse(str);
      cb(balances);
    });
  }).end();
}

function run(){
  // GetAccount id
  if(!account){
    getAccountId(function(account_){
      account = account_;
      console.log(account);
      getBalances(account.id, function(balances){
        if(balances.BTC < 1000){
          var obj = {
            accountId: account.id,
            amount: 1000,
            currency: 'BTC'
          }
          adjustBalance(obj, function(res){
            console.log(res);
          });
        } 
        if (balances.USD < 1000){
          var obj = {
            accountId: account.id,
            amount: 1000,
            currency: 'USD'
          }
          adjustBalance(obj, function(res){
            console.log(res);
          });
        } 
      });
    });  
  }
  
  
  var connString = 'wss://www.bitmex.com/realtime?';
  var params = 'subscribe=trade:XBTUSD,orderBookL2:XBTUSD';
  var websocket = new WebSocket(connString+params);

  websocket.on('open', function() {
    websocket.on('message', function(messageString){
      var message = JSON.parse(messageString);
      events.emit('newMessage', message);
    });
  });

  var startTime = new Date().getTime();
  setInterval(function(){
    var currTime = new Date().getTime();
    console.log('Ops:', (operations/(currTime-startTime)*1000).toFixed(2));
    getBalances(account.id, function(balances){
      console.log('Balances:', balances);
    });
  }, 2000);
}

run();
