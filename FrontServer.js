require('./Settings.js');
var net = require('net');
var buffer = require('./buffer.js');
var AgentServer = require('./AgentServer.js');

function RequestQueue() {
	var queue = {}, count = 1, closed = [];
	
	function _add(socket) {
		if (closed.length > 0) {
			socket.index = closed.shift();
		} else {
			socket.index = count++;
		}
		queue[socket.index] = socket;
	}
	
	function _rewriteHeader(socket, req) {
		socket.method = req.method;
		if (req.method != 'CONNECT') {
			//先从buffer中取出头部
			var _body_pos = buffer.findBody(socket.buffer);
			if (_body_pos < 0) _body_pos = socket.buffer.length;
			var header = socket.buffer.slice(0,_body_pos).toString('utf8');
			//替换connection头
			header = header.replace(/Keep\-Alive/i, 'close');
			header = header.replace(/120.27.95.240/i, 'wgq.sh.inter.customs.gov.cn');
			//替换网址格式(去掉域名部分)
			if (req.httpVersion == '1.1') {
				var url = req.path.replace(/http\:\/\/[^\/]+/,'');
				if (url.path != url) header = header.replace(req.path, url);
			}
			socket.buffer = buffer.join(new Buffer(header,'utf8'), socket.buffer.slice(_body_pos));
			//console.log(socket.buffer.toString('utf8'));
		}
	}
	
	this.add = function(socket) {
		socket.buffer = new Buffer(0);
		socket.on('data', function(data) {
			this.buffer = buffer.join(this.buffer, data);
			if (buffer.findBody(this.buffer) == -1) return;
			var req = buffer.parseRequest(this.buffer);
			if (req === false) return;
			this.pause();
			this.removeAllListeners('data');
			_rewriteHeader(this, req);
			//var agent = AgentServer.get(req.path.split('/')[1]);
			var agent = AgentServer.get();
			if (agent) {
				_add(this)
				agent.write(this.index + ',' + req.host + ',' + req.port + ',' + req.path + '\r\n\r\n');
				console.log('Pront ' + this.index + ': ' + req.method + ' ' + req.path);
			} else {
				this.end('agent not found');
			}
		});
	}
	
	this.get = function(index) {
		return queue[index];
	}
	
	this.close = function(socket) {
		if (socket && socket.index) {
			//queue[socket.index] = null;
			//closed.push(socket.index);
			console.log(socket.index + ' is closed.');
		}
	}
}

var _requestQueue = new RequestQueue();

net.createServer(function(requestSocket) {
	_requestQueue.add(requestSocket);
}).listen(port.front, function() {
	var address  =  this.address();
	console.log('Front Server listening %s:%s', address.address, address.port);
}).on('error', function (e) {
    if (e.code == 'EADDRINUSE') {
		console.log('ERROR: front server port ' + port.agent + ' in use.');
	} else {
		console.dir(e);
	}
});

exports.get = _requestQueue.get;
exports.close = _requestQueue.close;