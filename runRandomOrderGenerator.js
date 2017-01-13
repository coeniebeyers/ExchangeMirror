var uuid = require('uuid');
var WebSocket = require('ws');
var http = require('http');
var events = require('./eventEmitter.js');

var operations = 0;
var accountId = '58774677cd7cf607521df629';
var orderList = [];

var options = {
  host: 'localhost',
  port: 3033,
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

var callback = function(response) {
  /*var str = '';

  response.on('data', function (chunk) {
    str += chunk;
  });

  response.on('end', function () {
    console.log(str);
  });*/

  response.on('error', function (err) {
    console.log('ERROR:', err);
  });
};

process.on('uncaughtException', function (err) {
  console.error(err.stack);
  console.log("Node NOT Exiting...");
});

events.on('newOrder', function(order){
  var path = '/submitOrder?'
  path += 'timestamp='+order.timestamp;
  path += '&id='+order.id;
  path += '&accountId='+accountId;
  path += '&type='+order.type;
  path += '&price='+order.price;
  path += '&amount='+order.amount;
  options.path = path;
  http.request(options, callback).end();
  operations++;
});

function getBidOrAsk(){
  var res = Math.random() >= 0.5;
  if(res){
    return 'bid';
  } else {
    return 'ask';
  }
}

function getOffer(){
  var price = 700 + Math.floor((Math.random() * 100) + 1);
  var amount = Number((Math.floor((Math.random() * 1000) + 1)/100).toFixed(2));
  return {price: price, amount: amount};
}


function getAndRemoveRandomOrder(){
  var rInt = Math.floor(Math.random() * (orderList.length-1));
  return orderList.splice(rInt, 1)[0];
}

function createCancelOrder(cb){
  var orderTimestamp = new Date().getTime();  
  var bidOrAsk = getBidOrAsk();
  var orderToCancel = getAndRemoveRandomOrder();
  if(orderToCancel !== undefined){
    bidOrAsk = 'cancel' + bidOrAsk;
    var order = {
      timestamp: orderTimestamp,
      id: orderToCancel.id,
      accountId: orderToCancel.accountId,
      type: bidOrAsk,
      price: orderToCancel.price,
      amount: orderToCancel.amount
    };
    cb(order);
  }
}


// Asks: willing to sell currency1 for currency2
// Bids: willing to buy currency1 with currency2
function createOrder(cb){
  var orderTimestamp = new Date().getTime();  
  var orderId = uuid.v1();
  var bidOrAsk = getBidOrAsk();
  var offer = getOffer();
  var order = {
    timestamp: orderTimestamp,
    id: orderId,
    accountId: accountId,
    type: bidOrAsk,
    price: offer.price,
    amount: offer.amount
  };

  // TODO: this needs to move to a place where account balances are checked before the order is 
  // allowed on the orderbook
  /*if(order.type == 'ask' && order.amount > (account.currency1 - account.reservedCurrency1)){
      cb(null); 
    } else if(order.type == 'bid' 
       && (order.amount*order.price) > (account.currency2 - account.reservedCurrency2)){
     cb(null)
    } else {
      cb(order);
    }*/

  cb(order);
}

function createNewOrders(){
  setInterval(function(){
    for(var i = 1; i--;){
      createOrder(function(order){
        if(order){
          orderList.push(order);
          if(order.type == 'bid'){
            order.amount *= 1.1;
          }
          events.emit('newOrder', order);
        }
      });
    }
  }, 1);  
}

function createCancelOrders(){
  setInterval(function(){
    if(orderList.length > 200){
      createCancelOrder(function(order){
        events.emit('newOrder', order);
      });
    }
  }, 10);
}


function run(){
  var startTime = new Date().getTime();
  setInterval(function(){
    var currTime = new Date().getTime();
    console.log('Ops:', (operations/(currTime-startTime)*1000).toFixed(2));
  }, 2000);  

  createNewOrders();
  createCancelOrders();
}

run();
