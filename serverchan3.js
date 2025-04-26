const { scSend } = require('serverchan-sdk');

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
			var sendkey = this.server.sendkey  ;
			var title = msg.title || config.title || "Node-Red通知";
			var desp = msg.desp || config.desp || "Server酱3通知未设置desp";
			var tags = { tags: msg.tag || config.tag || ""};
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
					node.status({ fill: "green", shape: "dot", text: "发送成功" });
			    } catch (error) {
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