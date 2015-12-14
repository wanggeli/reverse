require('./Settings.js');
var net = require('net');

function AgentSockets() {
	var stack = {};
	
	this.add = function (socket) {
		socket.on('data', function(data) {
			this.inNo = data.toString('utf8');
			stack[this.inNo] = this;
			console.log('agent [' + this.inNo + '] is connected.');
		});
		socket.on('end', function() {
			console.log('agent [' + this.inNo + '] is end.');
			stack[this.inNo] = null;
		});
		socket.on('error', function(e) {
			console.log('agent [' + this.inNo + '] is error.', e);
			stack[this.inNo] = null;
		});
	};
	
	this.get = function (inNo) {
		if (inNo) return stack[inNo];
		for (var first in stack) {
			return stack[first];
		}
		return null;
	};
}

var _agentSockets = new AgentSockets();

net.createServer(function(agentSocket) {
	_agentSockets.add(agentSocket);
}).listen(port.agent, function() {
	var address  =  this.address();
	console.log('Agent Server listening %s:%s', address.address, address.port);
}).on('error', function (e) {
    if (e.code == 'EADDRINUSE') {
		console.log('ERROR: agent server port ' + port.agent + ' in use.');
	} else {
		console.dir(e);
	}
});

exports.get = _agentSockets.get;