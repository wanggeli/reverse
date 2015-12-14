/*
* 两个buffer对象加起来
*/
exports.join = function (buf1, buf2) {
	var result = new Buffer((buf1 ? buf1.length : 0) + (buf2 ? buf2.length : 0));
	if (buf1) buf1.copy(result);
	if (buf2) buf2.copy(result, (buf1 ? buf1.length : 0));
	return result;
}
/*
* 从缓存中找到头部结束标记(“\r\n\r\n”)的位置
*/
exports.findBody = function (buffer) {
	if (buffer) {
		for (var i = 0, len = buffer.length - 3; i < len; i++) {
			if (buffer[i] == 0x0d && buffer[i+1] == 0x0a && buffer[i+2] == 0x0d && buffer[i+3] == 0x0a) {
				return i + 4;
			}
		}
	}
	return -1;
};

/*
* 从请求头部取得请求详细信息
* 如果是 CONNECT  方法，返回 { method,host,port,httpVersion }
* 如果是 GET/POST 方法，返回 { method,host,port,path,httpVersion }
*/
exports.parseRequest = function (buffer) {
	try {
		var s = buffer.toString('utf8');
		var method = s.split('\n')[0].match(/^([A-Z]+)\s/)[1];
		if (method == 'CONNECT') {
			var arr = s.match(/^([A-Z]+)\s([^\:\s]+)\:(\d+)\sHTTP\/(\d\.\d)/);
			if (arr && arr[1] && arr[2] && arr[3] && arr[4])
				return { method: arr[1], host: arr[2], port: arr[3], httpVersion: arr[4] };
		} else {
			var arr = s.match(/^([A-Z]+)\s([^\s]+)\sHTTP\/(\d\.\d)/);
			if (arr && arr[1] && arr[2] && arr[3]) {
				var host = s.match(/Host\:\s+([^\n\s\r]+)/)[1];
				if (host) {
					var _p = host.split(':', 2);
					return { method: arr[1], host: _p[0], port: _p[1]?_p[1]:80, path: arr[2], httpVersion: arr[3] };
				}
			}
		}
	} catch (e) {}
	return false;
}