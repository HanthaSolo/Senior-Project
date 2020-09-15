const WebSocket = require('ws');

const consumer_s = new WebSocket.Server({ port: 16503 });
const producer_s = new WebSocket.Server({ port: 16505 });
    
var dataHistory = [];

consumer_s.broadcast = function broadcast(data) {
        consumer_s.clients.forEach(function each(client) {
                if (client.readyState === WebSocket.OPEN) {
                        client.send(data);
                }
        });
};
consumer_s.on('connection', function connection(consumer) {
        console.log('Connected to new Consumer');
        consumer.send(JSON.stringify({ type: 'terminal', body: 'Successfully Connected as Consumer' }));
        for (var i = 0; i < dataHistory.length; i++) {
                consumer.send(dataHistory[i]);
        }

        consumer.on('close', function close() {
                console.log('Consumer Disconnected');
        });
});

producer_s.on('connection', function connection(producer) {
        console.log('Connected to new Producer');
        producer.on('message', function incoming(data) {
                consumer_s.broadcast(data);
                console.log(data);
                dataHistory.push(data);
                if (dataHistory.length > 100) {
                        dataHistory.shift();
                }
        });

	producer.on('close', function close() {
                console.log('Disconnected from Producer');
        });
});

process.on('exit', function cleanup() {
        consumer_s.close();
        producer_s.close();
});
