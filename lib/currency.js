'use strict';

var _ = require('lodash');
var async = require('async');
var request = require('request');

function CurrencyController(options) {
  this.node = options.node;
  var refresh = options.currencyRefresh || CurrencyController.DEFAULT_CURRENCY_DELAY;
  this.currencyDelay = refresh * 60000;

  this.rateSources = {
    'USD': {
      name: 'Kraken',
      url: 'https://api.kraken.com/0/public/Ticker?pair=BCHUSD',
      path: 'result.BCHUSD.c[0]' // path to result
    },
    'EUR': {
      name: 'Kraken',
      url: 'https://api.kraken.com/0/public/Ticker?pair=BCHEUR',
      path: 'result.BCHEUR.c[0]' // path to result
    }
  };

  this.rates = {};
  this.timestamp = Date.now();
}

CurrencyController.DEFAULT_CURRENCY_DELAY = 10;

CurrencyController.prototype.index = function(req, res) {
  var self = this;
  var currentTime = Date.now();

  if (_.isEmpty(self.rates) || currentTime >= (self.timestamp + self.currencyDelay)) {
    self.timestamp = currentTime;

    async.eachSeries(Object.keys(self.rateSources), function(key, callback) {
      request(self.rateSources[key].url, function(err, response, body) {
        if (err) {
          self.node.log.error(err);
        }
        if (!err && response.statusCode === 200) {
          // Use the result path for source to read the response value.
          self.rates[key] = {
            name: self.rateSources[key].name,
            rate: parseFloat(_.get(JSON.parse(body), self.rateSources[key].path))
          };
        }
        callback();
      });

    }, function(err) {
      res.jsonp({
        status: 200,
        data: { 
          rates: self.rates
        }
      });
    });

  } else {
    res.jsonp({
      status: 200,
      data: { 
        rates: self.rates
      }
    });
  }

};

module.exports = CurrencyController;
