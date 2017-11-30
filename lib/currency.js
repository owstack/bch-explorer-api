'use strict';

var bchLib = require('@owstack/bch-lib');
var async = require('async');
var request = require('request');
var _ = bchLib.deps._;

var rateSources = {
  'USD': {
    providers: [{
      name: 'Kraken',
      url: 'https://api.kraken.com/0/public/Ticker?pair=BCHUSD',
      path: 'result.BCHUSD.c[0]', // path to result        
    }],
    unit: {
      name: 'US Dollar',
      shortName: 'USD',
      value: 0, // Fetched by client
      decimals: 2,
      code: 'USD',
      kind: 'fiat'
    }
  },
  'EUR': {
    providers: [{
      name: 'Kraken',
      url: 'https://api.kraken.com/0/public/Ticker?pair=BCHEUR',
      path: 'result.BCHEUR.c[0]', // path to result        
    }],
    unit: {
      name: 'Euro',
      shortName: 'EUR',
      value: 0, // Fetched by client
      decimals: 2,
      code: 'EUR',
      kind: 'fiat'
    }
  }
};

function CurrencyController(options) {
  this.node = options.node;
  var refresh = options.currencyRefresh || CurrencyController.DEFAULT_CURRENCY_DELAY;
  this.currencyDelay = refresh * 60000;
  this.rates = {};
  this.timestamp = Date.now();
}

CurrencyController.DEFAULT_CURRENCY_DELAY = 10;

CurrencyController.prototype.index = function(req, res) {
  var self = this;
  var currentTime = Date.now();

  if (_.isEmpty(self.rates) || currentTime >= (self.timestamp + self.currencyDelay)) {
    self.timestamp = currentTime;

    async.eachSeries(Object.keys(rateSources), function(currency, cCallback) {
      async.eachSeries(rateSources[currency].providers, function(provider, pCallback) {
        request(provider.url, function(err, response, body) {
          if (err) {
            self.node.log.error(err);
          }
          if (!err && response.statusCode === 200) {
            // Use the providers result object path for source to read the response value.
            self.rates[currency] = self.rates[currency] || [];

            // Remove old rate entry.
            self.rates[currency] = _.filter(self.rates[currency], function(c) {
              return c.name != provider.name;
            });

            // Add new rate entry.
            self.rates[currency].push({
              name: provider.name,
              rate: parseFloat(_.get(JSON.parse(body), provider.path))
            });
          }
          // Go to next provider
          pCallback();
        });

      }, function(err) {
        // Go to next currency
        cCallback();
      });

    }, function(err) {
      // Respond to client
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

CurrencyController.getUnits = function() {
  return _.map(Object.keys(rateSources), function(k) {
    return rateSources[k].unit;
  });
};

module.exports = CurrencyController;
