require('./Settings.js');
var net = require('net');
var FrontServer = require('./FrontServer.js');

net.createServer(function(socket) {
	socket.on('data', function(data) {
		this.removeAllListeners('data');
		this.index = data.toString('utf8');
		console.log(this.index);
		pipe(this);
	});
}).listen(port.proxy, function() {
	var address  =  this.address();
	console.log('Proxy Server listening %s:%s', address.address, address.port);
}).on('error', function (e) {
    if (e.code == 'EADDRINUSE') {
		console.log('ERROR: proxy server port ' + port.agent + ' in use.');
	} else {
		console.dir(e);
	}
});

//proxy = b, front = a
function pipe(proxy) {
	var front = FrontServer.get(proxy.index);
	if (!front) try { proxy.end(); } catch (e) {}
	
	proxy.on('data', function(data) {
		front.write(data);
	});
	proxy.on('end', function() {
		console.log('proxy ' + this.index + ' end');
		try { front.end(); } catch (e) {}
	});
	proxy.on('error', function(e) {
		console.log('proxy ' + this.index + ' error', e);
		try { front.destroy(); } catch (e) {}
	});
	
	front.on('data', function(data) {
		console.log('front ' + this.index + ' data');
		//console.log(data.toString('utf8'));
		proxy.write(data);
	});
	front.on('end', function() {
		console.log('front ' + this.index + ' end');
		try { proxy.end(); } catch (e) {}
		FrontServer.close(this);
		
	});
	front.on('error', function(e) {
		console.log('front ' + this.index + ' error', e);
		try { proxy.destroy(); } catch (e) {}
		FrontServer.close(this);
	});
	
	if (front.method == 'CONNECT') {
		front.write(new Buffer("HTTP/1.1 200 Connection established\r\nConnection: close\r\n\r\n"));
	} else {
		proxy.write(front.buffer);
	}
	front.resume();
}

