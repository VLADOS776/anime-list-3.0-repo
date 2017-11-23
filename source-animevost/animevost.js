module.exports = function(Plugin) {
    const config = {
        id: 'source-animevost',
        name: 'Animevost',
        description: 'Информация с сайта animevost.org',
        author: 'VLADOS776',
        version: '1.0.0',
        type: 'anime',
        source: 'animevost.org',
        dependencies: ['request', 'cheerio']
    }
    
    let request, cheerio;
    
    const baseUrl = 'http://animevost.org/';
    
    let cache = null;
    
    Plugin.newSource(config, {
        init: function(opt) {
            request = opt.dependencies.request;
            cheerio = opt.dependencies.cheerio;
        },
        search: function(query, callback) {
            request.post({ 
                url: baseUrl + '/index.php?do=search',
                form: {
                    do: 'search',
                    subaction: 'search',
                    story: query,
                    x: 0,
                    y: 0
                }
            }, function(err, response, body) {
                if (err) callback(err);
                let $ = cheerio.load(body),
                    ret = [];

                $('.shortstoryHead').each(function() {
                    let item = {};
                    let a = $(this).find('a'),
                        name = $(a).text(),
                        names = name.split('/');

                    if (names.length) {
                        item.russian = names[0].trim();
                        item.english = names[1].replace(/\[.*?\]/g, '').trim();
                    } else {
                        item.russian = name;
                    }
                    item.link = $(a).attr('href');
                    
                    item.type = 'anime';
                    item.source = config.source;
                    
                    ret.push(item);
                })

                callback(null, ret);
            })
        },
        info: function(opt, callback) {
            request({ url: opt.link }, function(err, response, body) {
                if (err) {
                    console.error(err);
                    res([]);
                    return;
                }

                let $ = cheerio.load(body),
                    $info = $('.shortstoryContent'),
                    tmp,
                    ret = {};

                // Кэшируем страницу. Если пользователь будет смотреть онлайн,
                // не придется заново загружать.
                cache = {
                    link: opt.link,
                    body: body
                }
                
                tmp = $('.shortstoryHead');
                if (tmp.length) {
                    let name = tmp.text();
                        names = name.split('/');
                    
                    if (names.length) {
                        ret.russian = names[0].trim();
                        ret.name = names[1].replace(/\[.*?\]/g, '').trim();
                    } else {
                        ret.russian = name;
                        ret.name = name;
                    }

                    let aired = name.match(/\[\d+-(\d+) /);
                    if (aired) {
                        ret.episodes_aired = parseInt(aired[1]);
                    }
                }

                tmp = $info.find('img');
                if (tmp.length) {
                    ret.cover = $(tmp[0]).attr('src');
                    if (!ret.cover.startsWith('htt')) {
                        ret.cover = 'http://animevost.org/' + ret.cover;
                    }
                }

                tmp = $('.current-rating');
                if (tmp.length) {
                    let score = parseInt($(tmp).text());
                    score /= 10;
                    score = score.toFixed(1);
                    ret.score = score;
                }

                tmp = $info.find('p:contains("Год выхода")');
                if (tmp.length) {
                    ret.year = parseInt($(tmp).text().replace('Год выхода:', '').trim());
                }
                
                tmp = $info.find('p:contains("Жанр")');
                if (tmp.length) {
                    let genres = $(tmp).text().replace('Жанр:', '').trim();
                    ret.genres = genres.split(',').map(item => { return { russian: item.trim() } });
                }
                
                tmp = $info.find('p:contains("Тип")');
                if (tmp.length) {
                    let type = $(tmp).text().replace('Тип:', '').trim();
                    ret.kind = type;
                }
                
                tmp = $info.find('p:contains("Количество серий")');
                if (tmp.length) {
                    let episodesText = $(tmp).text().replace('Количество серий:', '').trim(),
                        episodes = parseInt(episodesText);
                    ret.episodes = episodes;

                    let duration = episodesText.match(/\((\d+) мин/i);
                    if (duration) {
                        ret.duration = parseInt(duration[1])
                    }
                }
                
                tmp = $info.find('p:contains("Описание")');
                if (tmp.length) {
                    let descr = $(tmp).text().replace('Описание:', '').trim();
                    ret.description = descr;
                }
                
                tmp = $info.find('.skrin');
                if (tmp.length) {
                    ret.screenshots = [];
                    $(tmp).find('a').each(function() {
                        ret.screenshots.push({
                            original: $(this).attr('href'),
                            preview: $(this).attr('href')
                        })
                    })
                }
                
                ret.external_links = [
                    {
                        name: 'Animevost',
                        url: opt.link
                    }
                ]

                ret.source = config.source;
                ret.link = opt.link;
                ret.type = 'anime';
                
                cache = ret;
                
                let epData = body.match(/var data = {"(.*?)};/ig);
                if (epData) {
                    
                    cache.episodes_ajax = [];
                    epData[0].split(',').forEach(function(ep, i) {
                        let epName = ep.match(/"(.*?)"\s?:/),
                            epId = ep.match(/"(\d+)"$/);
                        if (epName && epId) {
                            cache.episodes_ajax.push({
                                episode: epName[1],
                                id: epId[1],
                                num: i + 1
                            })
                        }
                    })
                    
                }

                callback(ret);
            })
        },
        watch: function(info, callback) {
            if (cache != null && info.anime.link === cache.link) {
                let fandub = [];
                let currEp = cache.episodes_ajax.find(ep => ep.num === info.watch.ep);
                if (currEp) {
                    fandub.push({
                        video_id: currEp.id,
                        author: currEp.episode
                    })
                    
                    request('http://animevost.org/frame2.php?play=' + currEp.id, (err, response, body) => {
                        if (err) {
                            console.error(err);
                            callback({});
                            return;
                        }
                        let $ = cheerio.load(body);
                        
                        let player = {
                            embed: $('iframe').attr('src'),
                            video_id: currEp.id
                        }
                        callback({
                            player: player,
                            fandub: fandub
                        })
                    })
                }
            } else {
                this.info(info.anime, item => this.watch(info, callback))
            }
        }
    })
}