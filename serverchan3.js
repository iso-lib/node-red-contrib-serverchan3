const { scSend } = require('serverchan-sdk');

module.exports = function (RED) {
	function ServerChanNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

		node.on('input', function (msg) {
			var sendkey = config.sendkey || msg.sendkey;
			var title = config.title || msg.title || "Node-Red通知";
			var desp = config.desp || msg.desp || "Server酱3通知未设置desp";
			var tags = { tags: config.tag || msg.tag || ""};
			if  ( !sendkey ) {
				node.status({ text: "SendKey没有设置，请先配置..." });
				return;
			}
			(async function() {
			    try {
			        const response = await scSend(
			            sendkey,
			            title,
			            desp,
			            tags
			        );
			        node.send(msg);
			    } catch (error) {
			        node.send({platform: 'ServerChan3' , error});
			    }
			})();
		});
	}
	RED.nodes.registerType("serverchan3", ServerChanNode);
}