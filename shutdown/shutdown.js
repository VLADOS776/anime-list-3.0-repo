module.exports = function(Plugin) {
    const plugConfig = {
        id: 'shutdown',
        name: "Shutdown",
        description: "Позволяет удаленно выключать, отправлять в сон или гибернацию ПК. Откройте страницу /shutdown на сервере",
        author: "VLADOS776",
        version: "1.0.0",
        dependencies: ['./js/config', 'server']
    }
    
    const exec = require('child_process').exec;
    let config, Server;
    
    let commands = [
        {
            name: 'Гибернация / Сон',
            id: 'sleep',
            command: 'shutdown /h'
        },
        {
            name: 'Выключить',
            id: 'shutdown',
            command: 'shutdown -s -t 00'
        }
    ];
    
    Plugin.newPlugin(plugConfig, {
        init: function(opt) {
            config = opt.dependencies['./js/config'];
            Server = opt.dependencies.server;
            
            Server.app().get('/shutdown', (req, res) => {
                res.render(__dirname + '/server.pug');
            })
            Server.app().post('/api/shutdown/:action', (req, res) => {
                if (getCommand(req.params.action)) {
                    res.end('ok');
                    
                    exec(getCommand(req.params.action));
                } else {
                    res.end('fail');
                }
            })
            
            commands.forEach(item => {
                item.command = config.get(`plugins.${plugConfig.id}.${item.id}`, item.command);
            })
        },
        onEvent: function(event) {
            if (event.type === "openPage" && event.page === 'settings' && !jQuery('#shutdown-pane').length) {
                event.vue.page.tabs.push({
                    name: "Выключить пк",
                    pane: "#shutdown-pane"
                })
                
                let settingsPane = `
                    <div id="shutdown-pane" class="tab-pane fade">
                        <div class="row">
                            <div class="col-sm-4 text-right mb-3 pt-2">Команда выключения:</div>
                            <div class="col-sm-8 mb-3"><input type='text' class='form-control' value="${getCommand('shutdown')}" id='shutdown-turnOff-command'></div>
                            <div class="col-sm-4 text-right mb-3 pt-2">Команда сна / гибернации:</div>
                            <div class="col-sm-8 mb-3"><input type='text' class='form-control' value="${getCommand('sleep')}" id='shutdown-sleep-command'></div>
                            <div class="col-sm-4 text-right mb-3 pt-2">Проверка:</div>
                            <div class="col-sm-8 mb-3">
                                <button class='btn btn-outline-danger' id='shutdown-turnOff'>Выключить ПК</button>
                                <button class='btn btn-outline-warning' id='shutdown-sleep'>Сон / Гибернация</button>
                            </div>
                            <div class="col-sm-12">
                                <button id="shutdown-save" class="btn btn-outline-success btn-block">Сохранить настройки</button>
                                <a href="#" id="shutdown-server-page">Открыть страницу на сервере</a>
                            </div>
                        </div>
                    </div>
                `
                
                jQuery('.tab-content').append(settingsPane);
                
                jQuery(document).on('click', '#shutdown-turnOff', function() {
                    exec(getCommand('shutdown'));
                })
                jQuery(document).on('click', '#shutdown-sleep', function() {
                    exec(getCommand('sleep'));
                })
                jQuery(document).on('click', '#shutdown-server-page', function() {
                    let serverUrl = 'http://localhost:' + config.get('server.port', 3000) + '/shutdown';
                    
                    require('electron').shell.openExternal(serverUrl);
                })
                
                jQuery(document).on('click', '#shutdown-save', function() {
                    let cShutdown = jQuery('#shutdown-turnOff-command').val(),
                        cSleep = jQuery('#shutdown-sleep-command').val();
                    
                    config.set(`plugins.shutdown.shutdown`, cShutdown);
                    config.set(`plugins.shutdown.sleep`, cSleep);
                    
                    commands.find(item => item.id === 'shutdown').command = cShutdown;
                    commands.find(item => item.id === 'sleep').command = cSleep;
                })
            }
        }
    })

    function getCommand(id) {
        let command = commands.find(item => item.id === id);
        return command ? command.command : null;
    }
}