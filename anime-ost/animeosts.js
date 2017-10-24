// Anime List 3.0 Plugin

module.exports = function(Plugin) {
    const config = {
        name: 'Anime OSTs',
        id: 'animeost-thehylia',
        description: 'OST\'ы из аниме с сайта anime.thehylia.com',
        version: '1.0.0',
        author: 'VLADOS776',
		repo: 'https://github.com/VLADOS776/al3.0-Plugin-Anime-Ost',
        dependencies: ['request', 'cheerio', 'log', 'fuse']
    }

    const template = `<hr>
        <h5>OST</h5>
        <div id="osts">
            <div class='load-spinner small'></div>
        </div>`;
    
    const playerTemplate = `
        <div id="animeost-player-wrap">
            <div id="animeost-trackname">Track name here...</div>
            <button class="close" onclick="$('#animeost-player-wrap').remove();"><span>&times;</span></button>
            <audio id="animeost-player" controls></audio>
        </div>`;
    const insertCSS = `
    #osts li span {
        cursor: pointer;
    }
    #animeost-player-wrap {
        position: fixed;
        bottom: 0;
        right: 0;
        background: rgba(0,0,0,0.5);
        padding: 10px;
    }
    #animeost-player-wrap .close {
        position: absolute;
        top: 0;
        right: 5px;
        color: #fff;
    }`

    let request, cheerio, Fuse;
    let animeAlbums = {},
        albumSongs = {},
        songsLinks = {};
    const fuseConfig = {
        shouldSort: true,
        threshold: 0.25,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: [ "name" ]
      };
    
    Plugin.newPlugin(config, {
        init: function(opt) {
            request = opt.dependencies.request;
            cheerio = opt.dependencies.cheerio;
            Fuse = opt.dependencies.fuse;

            jQuery('body').append(`<style>${insertCSS}</style>`);
        },
        onEvent: function(event) {
            if (event.type === 'openPage' && event.page === 'anime') {
                let firstLetter = event.selected.name[0].toUpperCase();

                if (/^[A-Z]/.test(firstLetter)) {
                    let url = 'https://anime.thehylia.com/soundtracks/browse/' + firstLetter;

                    if (!jQuery('.screensVideo').length) {
                        console.warn('Отключен показ блока медиа!');
                        return;
                    }

                    jQuery('.screensVideo').after(template);

                    if (animeAlbums[event.selected.name] != null) {
                        showAlbums(animeAlbums[event.selected.name]);
                    } else {
                        request(url, (err, response, body) => {
                            if (err) {
                                console.error(err);
                                return;
                            }
                            let $ = cheerio.load(body),
                                allNames = [];
                            $('td p[align="left"] a').each(function(index) {
                                let name = $(this).text();
    
                                allNames.push({
                                    name: name,
                                    link: $(this).attr('href')
                                })
                            })

                            let fuse = new Fuse(allNames, fuseConfig);
                            let result = fuse.search(event.selected.name);

                            animeAlbums[event.selected.name] = result;
                            showAlbums(result);
                        })
                    }

                } else {
                    console.warn('Название аниме не на английском или название начинается не с буквы.');
                }
            }
            if (event.type === 'plugin' && event.plugin === 'animeost') {
                if (event.action === 'selectAlbum') {
                    let link = event.link;

                    jQuery('#osts').html("<div class='load-spinner small'></div>");

                    request(link, (err, response, body) => {
                        if (err) {
                            console.error(err);
                            return;
                        }

                        let $ = cheerio.load(body),
                            allSongs = [],
                            albumName = $($('h2')[0]).text();

                        $($('.floatbox table.blog table')[0]).find('tr').each(function(element) {
                            let a = $(this).find('td a'),
                                link = $(a).attr('href'),
                                name = $(a).parent().text(),
                                size = $(a).parent().next('td').text();
                            allSongs.push({
                                name: name,
                                size: size,
                                link: link
                            })
                        });

                        albumSongs[albumName] = allSongs;
                        showSongs(allSongs);
                    })
                }
                if (event.action === 'play') {
                    // Если плеера нет - создаем
                    if (!jQuery('#animeost-player-wrap').length) {
                        jQuery('body').append(playerTemplate);
                    }

                    let player = document.getElementById('animeost-player');
                    jQuery('#animeost-trackname').text(event.name);

                    if (songsLinks[event.name] != null) {
                        player.src = songsLinks[event.name];
                        player.play()
                    } else {
                        request(event.link, (err, response, body) => {
                            if (err) {
                                console.error(err);
                                return
                            }
                            let $ = cheerio.load(body);

                            let songLink = $('a:contains("Download")').attr('href');

                            songsLinks[event.name] = songLink;
                            player.src = songLink;
                            player.play();
                        })
                    }
                }
                if (event.action === 'showAlbums') {
                    showAlbums(animeAlbums[event.name]);
                }
            }
        }
    })

    function showAlbums(albums) {
        let ostsHTML = '<b>Выберите альбом</b><ul>';
        if (albums.length) {
            albums.forEach(function(element) {
                ostsHTML += `<li><span onclick="Plugins.$event({ type: 'plugin', plugin: 'animeost', action: 'selectAlbum', link: '${element.link}' })">${element.name}</span></li>`
            }, this);
        } else {
            ostsHTML = 'Ничего не найдено'
        }

        jQuery('#osts').html(ostsHTML);
    }

    function showSongs(songs) {
        let ostsHTML = '<b>Выберите песню</b><ul>';
        ostsHTML += `<li><span onclick="Plugins.$event({ type: 'plugin', plugin: 'animeost', action: 'showAlbums', name: '${app.selected.name}' })">Назад к альбомам</span></li>`;
        if (songs.length) {
            songs.forEach(function(element) {
                ostsHTML += `<li><span onclick="Plugins.$event({ type: 'plugin', plugin: 'animeost', action: 'play', link: '${element.link}', name: '${element.name}' })">${element.name} - ${element.size}</span></li>`
            }, this);
        } else {
            ostsHTML = 'В альбоме нет песен';
        }

        jQuery('#osts').html(ostsHTML);
    }
}