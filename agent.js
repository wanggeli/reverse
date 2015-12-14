var inNo = '0328';

var servers = {
	customs: { host: 'wgq.sh.inter.customs.gov.cn', port: 8001 },
	forward: { host: '120.27.95.240', port: { agent: 5432, proxy: 1008 } }
}

var net = require('net');

function connectAgentServer() {
	net.connect(servers.forward.port.agent, servers.forward.host, function() {
		console.log('agent [' + inNo + '] is connected.');
		var socket = this;
		socket.buffer = new Buffer(0);
		socket.write(inNo);
		setInterval(function() { socket.write(inNo); }, 1000 * 60); // send heartbeat per 1 minutes
	}).on('end', function() {
		console.log('agent [' + inNo + '] is closed.');
		connectAgentServer(); //reconenct
	}).on('error', function(e) {
		console.log('agent [' + inNo + '] ERROR:', e);
		connectAgentServer(); //reconnect
	}).on('data', function(data) {
		this.buffer = buffer_add(this.buffer, data);
		var _body_pos = buffer_find_body(this.buffer);
		while (_body_pos > 0) {
			var options = this.buffer.slice(0, _body_pos).toString('utf8').split(',');
			this.buffer = this.buffer.slice(_body_pos)
			console.log(options[0], options[3]);
			connectCustomsServer(options[0]);
			_body_pos = buffer_find_body(this.buffer);
		}
	});
}
connectAgentServer();

function connectCustomsServer(requestIndex) {
	var socket = net.connect({host: servers.customs.host, port: servers.customs.port}, function () {
		console.log('customs server [' + this.index + '] is connected');
		connectProxyServer(this);
	});
	socket.index = requestIndex;
}

function connectProxyServer(customsSocket) {
	var socket = net.connect(servers.forward.port.proxy, servers.forward.host, function() {
		console.log('proxy server [' + this.index + '] is connected');
		pipe(this, customsSocket);
	});
	socket.index = customsSocket.index;
}
// proxy = b, customs = c
function pipe(proxy, customs) {
	proxy.on('data', function(data){
		console.log('proxy ' + this.index + ' data');
		//console.log(data.toString('utf8'));
		customs.write(data);
	});
	proxy.on('end', function() {
		console.log('proxy ' + this.index + ' end');
		try { customs.end(); } catch (e) { }
	});
	proxy.on('error', function(e) {
		console.log('proxy ' + this.index + ' error', e);
		try { customs.destroy(); } catch (e) { }
	});
	
	customs.on('data', function(data) {
		console.log('customs ' + this.index + ' data');
		proxy.write(data);
	});
	customs.on('end', function() {
		console.log('customs ' + this.index + ' end');
		try { proxy.end(); } catch (e) { }
	});
	customs.on('error', function(e) {
		console.log('customs ' + this.index + ' error', e);
		try { proxy.destroy(); } catch (e) { }
	});
	proxy.write(proxy.index);
}

/*
* 两个buffer对象加起来
*/
function buffer_add(buf1, buf2) {
	var result = new Buffer((buf1 ? buf1.length : 0) + (buf2 ? buf2.length : 0));
	if (buf1) buf1.copy(result);
	if (buf2) buf2.copy(result, (buf1 ? buf1.length : 0));
	return result;
}
/*
* 从缓存中找到头部结束标记(“\r\n\r\n”)的位置
*/
function buffer_find_body(buffer) {
	if (buffer) {
		for (var i = 0, len = buffer.length - 3; i < len; i++) {
			if (buffer[i] == 0x0d && buffer[i+1] == 0x0a && buffer[i+2] == 0x0d && buffer[i+3] == 0x0a) {
				return i + 4;
			}
		}
	}
	return -1;
}