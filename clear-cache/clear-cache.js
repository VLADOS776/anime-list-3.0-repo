module.exports = function(Plugin) {
    const config = {
        name: "Очистка кэша",
        id: "clear-cache",
        description: "Добавляет в настройки вкладку с информацией о кэше с возможностью очистки",
        version: "1.0.0",
        author: "VLADOS776",
        category: ['Разное']
    }
    
    let template = `
        <div id="cache-pane" class="tab-pane fade">
            <div class="row">
                <div class="col-sm-4 text-right mb-3">Размер кэша:</div>
                <div class="col-sm-8 cache-size mb-3">...</div>
                <div class="col-sm-12">
                    <button id="clear-cache" class="btn btn-outline-success btn-block">Очистить кэш</button>
                </div>
            </div>
        </div>
    `;

    const session = require('electron').remote.getCurrentWindow().webContents.session;
    
    function roundSize(size) {
        size = size / 1024 / 1024;
        size = size.toFixed(2);
        return parseFloat(size);
    }
    
    function setSize() {
        session.getCacheSize(function(cacheSize) {
            jQuery('.cache-size').text(roundSize(cacheSize) + ' Мб');
        })
    }
    
    Plugin.newPlugin(config, {
        onEvent: function(event) {
            if (event.type === "openPage" && event.page === 'settings' && !jQuery('#cache-pane').length) {
                event.vue.page.tabs.push({
                    name: "Кэш",
                    pane: "#cache-pane"
                })
                
                jQuery('.tab-content').append(template);
                
                setSize();
                    
                jQuery(document).on('click', '#clear-cache', function() {
                    session.clearCache(function() {
                        setSize();
                    })
                })
            }
        }
    })
}