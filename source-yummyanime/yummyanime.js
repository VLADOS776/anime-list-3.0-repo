module.exports = function(Plugin) {
    const config = {
        id: 'source-yummyanime',
        name: 'Yummyanime',
        description: 'Информация с сайта yummyanime.com',
        author: 'VLADOS776',
        icon: 'icon.png',
        version: '1.0.0',
        type: 'anime',
        source: 'yummyanime.com',
        dependencies: ['request', 'cheerio']
    }
    
    let request, cheerio;
    
    const baseUrl = 'http://yummyanime.com/';
    
    let cache = null;
    
    Plugin.newSource(config, {
        init: function(opt) {
            request = opt.dependencies.request;
            cheerio = opt.dependencies.cheerio;
        },
        search: function(query, callback) {
            request.get(baseUrl + 'search?word=' + encodeURI(query), function(err, response, body) {
                let $ = cheerio.load(body),
                    ret = [];

                $('.content-page .anime-column').each(function() {
                    let item = {},
                        tmp;
                    
                    item.year = parseInt($(this).find('.year-block').text());
                    item.cover = baseUrl + $($(this).find('img')[0]).attr('src');

                    tmp = $(this).find('.anime-title');
                    item.name = tmp.text();
                    item.russian = item.name;
                    item.link = baseUrl + tmp.attr('href');
                    item.kind = $(this).find('.anime-type').text();

                    tmp = $(this).find('.rating-info').text();
                    tmp = tmp.match(/(\d+(?:\.\d+)?) из/);
                    if (tmp) {
                        item.score = parseFloat(tmp[1]);
                    }
                    
                    item.type = 'anime';
                    item.source = config.source;

                    ret.push(item);
                })

                callback(null, ret);
            })
        },
        info: function(item, callback) {
            request.get(item.link, function(err, response, body) {
                if (err) {
                    console.error(err);
                    callback(null, err);
                    return;
                }
                if (response.statusCode !== 200) {
                    console.log(response);
                    callback(null, response.statusCode);
                    return;
                }
                
                let $ = cheerio.load(body),
                    ret = {};
                
                ret.link = item.link;
                ret.cover = 'http://yummyanime.com' + $('.poster-block img').attr('src');
                ret.russian = $('.content h1').text();
                
                let altNames = [];
                $('.content .alt-names-list li').each(function() {
                    altNames.push($(this).text());
                })
                ret.altNames = altNames;
                
                if (altNames.length) {
                    ret.name = ret.altNames[0];
                    ret.altNames.splice(0, 1);
                } else {
                    ret.name = ret.russian;
                }
                
                let rating = $('.preview-rating .rating')
                if (rating.length) {
                    ret.score = parseFloat(rating.attr('data-average'))
                }
                
                $('.content-main-info li').each(function() {
                    let span = $(this).find('span').eq(0).text();
                    
                    if (span.match('Год')) {
                        ret.year = parseInt($(this).text().replace('Год:','').trim());
                    } else if (span.match('Жанр')) {
                        let genres = []
                        $(this).find('.categories-list li').each(function() {
                            genres.push($(this).text().replace(',', '').trim());
                        })
                        ret.genres = genres;
                    } else if (span.match('Серии')) {
                        let eps = $(this).text()
                                         .replace('Серии:', '')
                                         .replace('>', '')
                                         .trim();
                        ret.episodes = parseInt(eps);
                        
                    } else if (span.match('Тип')) {
                        ret.kind = $(this).text().replace('Тип:', '').trim();
                    } else if (span.match('Статус')) {
                        let status = $(this).text().replace('Статус:', '').trim();
                        if (status === 'вышел') {
                            ret.episodes_aired = ret.episodes
                        }
                    }
                })
                let descr = [];
                $('.content-desc p').each(function() {
                    descr.push($(this).text())
                });
                ret.description = descr.join('\r\n');
                
                ret.source = config.source;
                ret.type = 'anime';
                
                if (!ret.episodes_aired && ret.watchInfo) {
                    let aired = 0;
                    ret.watchInfo.forEach(item => {
                        if (item.episodes && item.episodes.length > aired) aired = item.episodes.length;
                    })
                    ret.episodes_aired = aired;
                }
                
                cache = ret;
                
                let $video = $('#video');
                if ($video.length) {
                    let watchInfo = [];
                    $video.find('.video-block').each(function() {
                        let block = {
                            episodes: []
                        };
                        block.info = $(this).find('.video-block-description').text();
                        $(this).find('.video-button').each(function() {
                            block.episodes.push({
                                episode: $(this).text().trim(),
                                link: $(this).attr('href'),
                                video_id: $(this).attr('data-id')
                            })
                        })
                        
                        watchInfo.push(block);
                    })
                    
                    cache.watchInfo = watchInfo;
                }
                
                callback(ret);
            })
        },
        watch: function(info, callback) {
            if (info.videoOnly && (info.videos.fandub || info.videos.sub)) {
                let find = info.videos.fandub.find(el => el.video_id == info.watch.video_id);
                if (!find) {
                    find = info.videos.sub.find(el => el.video_id == info.watch.video_id);
                }
                if (!find) {
                    callback(null, {msg: 'Не найдено видео с таким id', code: 404});
                    return;
                }
                
                let ret = info.videos;
                ret.player = {
                    embed: find.link,
                    video_id: find.video_id
                }
                callback(ret);
                return;
            }
            
            if (cache != null && info.anime.link === cache.link) {
                let fandub = [],
                    sub = [];
                cache.watchInfo.forEach(function(block) {
                    let currEp = block.episodes.find(video => video.episode == info.watch.ep);
                    if (currEp) {
                        if (block.info.match(/субтит/i)) {
                            sub.push({
                                video_id: currEp.video_id,
                                author: block.info,
                                link: currEp.link
                            })
                        } else {
                            fandub.push({
                                video_id: currEp.video_id,
                                author: block.info,
                                link: currEp.link
                            })
                        }
                    }
                }, this);
                
                let selected = fandub.length ? fandub[0] : sub.length ? sub[0] : null;
                let player = {};
                
                if (info.watch.video_id) {
                    let find = fandub.find(video => video.video_id == info.watch.video_id);
                    if (!find) {
                        find = sub.find(video => video.video_id == info.watch.video_id);
                    }
                    
                    if (find) {
                        selected = find
                    }
                }
                
                if (selected) {
                    player.embed = selected.link;
                    player.video_id = selected.video_id;
                }
                callback({
                    player: player,
                    fandub: fandub,
                    sub: sub
                })
            } else {
                this.info(info.anime, item => this.watch(info, callback))
            }
        }
    })
}