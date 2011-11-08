console.log("Ignition...");
var connect = require('connect');
var client = require('browserify')({mount: '/lib.js', watch: true});
var server = connect.createServer();
var port = 8000;

client.require(['./js/renderer', './js/hgraph', './js/rendr']);

server.use(connect.static(__dirname));
server.use(client);
server.listen(port, function(e) {
    if(e) 
        console.log(e);
    else
        console.log("GAMEON! at http://localhost:" + port);
});

