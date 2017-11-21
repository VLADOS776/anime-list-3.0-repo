const changelog = {
    '1.1.0': 'Новые серии показываются не только при старте, но и при переходе на стартовую страницу.'
}

module.exports = function(Plugin) {
    const config = {
        id: 'ongoing-alert',
        name: "Ongoing Alert",
        description: "При старте программы проверяет наличие новых эпизодов и выводит уведомление",
        author: "VLADOS776",
        version: "1.1.0",
        category: ['Аниме'],
        icon: 'icon.png',
        changelog: changelog
    }
    
    let Vue;
    
    Plugin.newPlugin(config, {
        init: function(opt) {
            
            setTimeout(function() {
                showAlert(opt.app.allAnime);
            }, 300)
        },
        onEvent: function(event) {
            if (event.type === 'openPage' && event.page === 'start') {
                showAlert(event.vue.app.allAnime);
            }
        }
    })
    
    function showAlert(allAnime) {
        let now = new Date();

        let ongoings = allAnime.filter(item => item.next_episode_at);
        let alertText = `<div class="alert alert-success alert-dismissible fade show" role="alert"><strong>Новые эпизоды:</strong><button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>`;

        let count = 0;

        ongoings.forEach(item => {
            let nextEp = new Date(item.next_episode_at);

            if (nextEp - now < 0) {
                alertText += `<div>${item.russian || item.name} - ${item.availableEp + 1} эп.</div>`;
                count++;
            }
        });

        alertText += `</div>`;

        if (count > 0)
            jQuery('.start').prepend(alertText);
    }
}