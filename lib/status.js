'use strict';

var Common = require('./common');
var spawnSync = require('child_process').spawnSync;

var _getExternalIP = function() {
  var dig = spawnSync('dig', ['+short', 'myip.opendns.com', '@resolver1.opendns.com'], {encoding: 'UTF-8'});
  return dig.stdout.trim() || 'error';
};

function StatusController(node) {
  this.ip = _getExternalIP();
  this.node = node;
  this.common = new Common({log: this.node.log});
  this._block = this.node.services.block;
  this._header = this.node.services.header;
  this._block = this.node.services.block;
}

StatusController.prototype.show = function(req, res) {
  var self = this;
  var option = req.query.q;

  switch(option) {
  case 'getDifficulty':
    this.getDifficulty(function(err, result) {
      if (err) {
        return self.common.handleErrors(err, res);
      }
      res.jsonp(result);
    });
    break;
  case 'getLastBlockHash':
    res.jsonp(this.getLastBlockHash());
    break;
  case 'getBestBlockHash':
    this.getBestBlockHash(function(err, result) {
      if (err) {
        return self.common.handleErrors(err, res);
      }
      res.jsonp(result);
    });
    break;
  case 'getInfo':
  default:
    this.getInfo(function(err, result) {
      if (err) {
        return self.common.handleErrors(err, res);
      }
      res.jsonp({
        info: result
      });
    });
  }
};

StatusController.prototype.getInfo = function(callback) {
  this._block.getInfo(function(err, result) {
    if (err) {
      return callback(err);
    }
    var info = {
      version: result.version,
      protocolversion: result.protocolversion,
      blocks: result.blocks,
      timeoffset: result.timeoffset,
      connections: result.connections,
      proxy: result.proxy,
      difficulty: result.difficulty,
      testnet: result.testnet,
      relayfee: result.relayFee,
      errors: result.errors,
      network: result.network,
      description: {
        name: 'Bitcoin Cash',
        protocol: 'bitcoincash:'
      },
      units: [{
        name: 'Bitcoin Cash',
        shortName: 'BCC',
        value: 100000000,
        decimals: 8,
        code: 'BCC',
        kind: 'standard',
        userSelectable: true
      }, {
        name: 'bits (1,000,000 bits = 1BCC)',
        shortName: 'bits',
        value: 100,
        decimals: 2,
        code: 'bit',
        kind: 'alternative',
        userSelectable: true
      }, {
        name: 'satoshi (100,000,000 satoshi = 1BCC)',
        shortName: 'satoshis',
        value: 1,
        decimals: 0,
        code: 'satoshi',
        kind: 'atomic',
        userSelectable: false
      }, {
        name: 'US Dollar',
        shortName: 'USD',
        value: 0, // Fetched by client when needed
        decimals: 2,
        code: 'USD',
        kind: 'fiat',
        userSelectable: true
      }, {
        name: 'Euro',
        shortName: 'EUR',
        value: 0, // Fetched by client when needed
        decimals: 2,
        code: 'EUR',
        kind: 'fiat',
        userSelectable: true
      }],
      subversion: result.subversion,
      localservices: result.localServices
    };
    callback(null, info);
  });
};

StatusController.prototype.getLastBlockHash = function() {
  var hash = this._block.getTip().hash;
  return {
    syncTipHash: hash,
    lastblockhash: hash
  };
};

StatusController.prototype.getBestBlockHash = function(callback) {
  this._block.getBestBlockHash(function(err, hash) {
    if (err) {
      return callback(err);
    }
    callback(null, {
      bestblockhash: hash
    });
  });
};

StatusController.prototype.getDifficulty = function(callback) {
  this.getInfo(function(err, info) {
    if (err) {
      return callback(err);
    }
    callback(null, {
      difficulty: info.difficulty
    });
  });
};

StatusController.prototype.sync = function(req, res) {
  var self = this;
  var status = 'syncing';

  this._block.isSynced(function(err, synced) {
    if (err) {
      return self.common.handleErrors(err, res);
    }
    if (synced) {
      status = 'finished';
    }

    self._block.syncPercentage(function(err, percentage) {
      if (err) {
        return self.common.handleErrors(err, res);
      }
      var info = {
        status: status,
        blockChainHeight: self._block.getTip().height,
        syncPercentage: Math.round(percentage),
        height: self._block.getTip().height,
        error: null,
        type: 'bcccore node'
      };

      res.jsonp(info);

    });

  });

};

StatusController.prototype.peer = function(req, res) {
  res.jsonp({
    connected: true,
    host: this.ip,
    port: this.node.port
  });
};

StatusController.prototype.version = function(req, res) {
  var pjson = require('../package.json');
  res.jsonp({
    version: pjson.version
  });
};

module.exports = StatusController;
