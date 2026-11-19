const https = require('https');
const { scSend } = require('serverchan-sdk');

// Server酱MAX（内测）：SendKey 以 scx- 开头，格式 scx-<用户ID>-<密钥>
// 请求地址为 https://<用户ID>.max.ft07.com/v1/send，
// Authorization: Bearer <完整 SendKey>，其余 SendKey 仍走 serverchan-sdk。
function isMaxSendKey(sendkey) {
	return typeof sendkey === 'string' && sendkey.trim().startsWith('scx-');
}

function maxUserId(sendkey) {
	const m = /^scx-([^-]+)-/.exec(sendkey.trim());
	return m ? m[1] : null;
}

function toTagsArray(tag) {
	if (!tag) return [];
	if (Array.isArray(tag)) return tag.map(function (t) { return String(t).trim(); }).filter(Boolean);
	return String(tag).split(/[|,，]/).map(function (t) { return t.trim(); }).filter(Boolean);
}

function sendMax(sendkey, title, desp, tag) {
	return new Promise(function (resolve, reject) {
		const uid = maxUserId(sendkey);
		if (!uid) {
			reject(new Error('Server酱MAX SendKey 格式不正确，应为 scx-<用户ID>-...'));
			return;
		}
		const payload = { title: title, desp: desp };
		const tags = toTagsArray(tag);
		if (tags.length) payload.tags = tags;
		const body = JSON.stringify(payload);
		const req = https.request({
			hostname: uid + '.max.ft07.com',
			path: '/v1/send',
			method: 'POST',
			headers: {
				'Authorization': 'Bearer ' + sendkey.trim(),
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(body),
				'User-Agent': 'node-red-contrib-serverchan3'
			},
			timeout: 15000
		}, function (res) {
			let raw = '';
			res.on('data', function (chunk) { raw += chunk; });
			res.on('end', function () {
				let data = null;
				try { data = JSON.parse(raw); } catch (e) { /* 非 JSON 响应按原文处理 */ }
				if (res.statusCode >= 200 && res.statusCode < 300 && (!data || data.code === undefined || data.code === 0)) {
					resolve(data || { code: 0, raw: raw });
				} else {
					const msg = (data && (data.message || data.msg || data.error)) || raw || ('HTTP ' + res.statusCode);
					reject(new Error('Server酱MAX 发送失败：' + msg));
				}
			});
		});
		req.on('timeout', function () { req.destroy(new Error('Server酱MAX 请求超时')); });
		req.on('error', reject);
		req.write(body);
		req.end();
	});
}

module.exports = function (RED) {
	function ServerChanNode(config) {
        RED.nodes.createNode(this, config);
		this.server = RED.nodes.getNode(config.server);
        var node = this;
        if ( !this.server ) {
            node.error("没有配置正确的Server酱3服务");
            return
        }
        // var node = this;

		node.on('input', function (msg) {
			var sendkey = (this.server.sendkey || '').trim();
			var title = msg.title || config.title || "Node-Red通知";
			var desp = msg.desp || config.desp || "Server酱3通知未设置desp";
			var tag = msg.tag || config.tag || "";
			if  ( !sendkey ) {
				node.status({ text: "SendKey没有设置，请先配置..." });
				return;
			}
			(async function() {
			    try {
				if (isMaxSendKey(sendkey)) {
					await sendMax(sendkey, title, desp, tag);
				} else {
					await scSend(
						sendkey,
						title,
						desp,
						{ tags: tag }
					);
				}
				node.send(msg);
				node.status({ fill: "green", shape: "dot", text: "发送成功" });
			    } catch (error) {
				node.status({ fill: "red", shape: "ring", text: "发送失败" });
				node.send({platform: 'ServerChan3' , error});
			    }
			})();
		});
	}
	RED.nodes.registerType("serverchan3", ServerChanNode);

	function serverchan3ServerNode(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
		this.sendkey = n.sendkey;
	}
	RED.nodes.registerType("serverchan3-server", serverchan3ServerNode);
}
