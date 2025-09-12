// load sprite
let redman = App.loadSpritesheet('redman.png', 48, 64, {
    left: [5, 6, 7, 8, 9],
    up: [15, 16, 17, 18, 19],
    down: [0, 1, 2, 3, 4],
    right: [10, 11, 12, 13, 14],
}, 8);

let blueman = App.loadSpritesheet('blueman.png', 48, 64, {
    left: [5, 6, 7, 8, 9],
    up: [15, 16, 17, 18, 19],
    down: [0, 1, 2, 3, 4],
    right: [10, 11, 12, 13, 14],
}, 8);

const STATE_INIT = 3000;
const STATE_READY = 3001;
const STATE_PLAYING = 3002;
const STATE_JUDGE = 3004;
const STATE_END = 3005;

let red = App.loadSpritesheet('red.png');
let blue = App.loadSpritesheet('blue.png');
let green = App.loadSpritesheet('green.png');
let yellow = App.loadSpritesheet('yellow.png');
let tomb = App.loadSpritesheet('tomb.png');

let _start = false;
let _gameEnd = false;
let _state = STATE_INIT;
let _stateTimer = 0;
let _timer = 90;

let _objects = {};

let _pollutionScore = 0; // 오염(적팀) 점수 (레드+그린+옐로)
let _playerScore = 0;

let HEIGHT_KEY = 10000000;

let _blueTeam = [];
let _players = App.players;
let _resultStr = '';

function startState(state)
{
    _state = state;
    _stateTimer = 0;

    switch(_state)
    {
        case STATE_INIT:
            _start = true;
            _stateTimer = 0;
            _timer = 90;

            _pollutionScore = 0;
            _playerScore = 0;
            _objects = {};
            _blueTeam = [];

            // 모든 플레이어를 청소팀으로 설정
            for(let i in _players) {
                let p = _players[i];
                p.tag = {
                    x: p.tileX,
                    y: p.tileY,
                    team: 1, // player팀 고정
                };
                _blueTeam.push(p);
                p.sprite = blueman;
                p.nameColor = 255;
                p.sendUpdated();
            }

            // 맵 전체를 깨끗하게(블루) 칠함
            for(let y = 0; y < Map.height; y++) {
                for(let x = 0; x < Map.width; x++) {
                    _objects[y * HEIGHT_KEY + x] = 2; // 2: blue
                    Map.putObject(x, y, blue, { overlap: true });
                    _playerScore++;
                }
            }
            break;
        case STATE_READY:
            for(let i in _players) {
                let p = _players[i];
                p.moveSpeed = 0;
                p.sendUpdated();
            }
            break;
        case STATE_PLAYING:
            for(let i in _players) {
                let p = _players[i];
                p.moveSpeed = 80;
                p.sendUpdated();
            }
            break;
        case STATE_JUDGE:
            for(let i in _players) {
                let p = _players[i];
                p.moveSpeed = 0;
                p.sendUpdated();
            }
            break;
        case STATE_END:
            _start = false;
            for(let i in _players) {
                let p = _players[i];
                p.moveSpeed = 80;
                p.title = null;
                p.sprite = null;
                p.sendUpdated();
            }
            Map.clearAllObjects();
            break;
    }
}

App.onStart.Add(function(){
    startState(STATE_INIT);
});

App.onJoinPlayer.Add(function(p) {
    p.tag = {
        x: p.tileX,
        y: p.tileY,
        team: 1, // player팀 고정
    };
    _blueTeam.push(p);
    p.nameColor = 255;
    p.sprite = blueman;
    p.sendUpdated();
    _players = App.players;
});

App.onLeavePlayer.Add(function(p) {
    p.moveSpeed = 80;
    p.title = null;
    p.sprite = null;
    p.sendUpdated();
    _players = App.players;
});

App.onDestroy.Add(function() {
    Map.clearAllObjects();
})

App.onUnitAttacked.Add(function(sender, x, y, target) {
    // 모두 player팀이므로 공격 불가
});

App.onUpdate.Add(function(dt) {
    if(!_start)
        return;

    _stateTimer += dt;

    switch(_state)
    {
        case STATE_INIT:
            App.showCenterLabel("바닥을 청소하세요!\n오염(적팀)이 자동으로 바닥을 더럽힙니다.\n모든 오염을 청소하면 승리합니다.");
            if(_stateTimer >= 5)
            {
                startState(STATE_READY);
            }
            break;
        case STATE_READY:
            App.showCenterLabel("곧 청소가 시작됩니다.");
            if(_stateTimer >= 3)
            {
                startState(STATE_PLAYING);
            }
            break;
        case STATE_PLAYING:
            App.showCenterLabel(_timer +  `\n오염 VS player\n` + _pollutionScore + "  VS  " + _playerScore);
            if(_stateTimer >= 1) {
                _stateTimer = 0;
                _timer--;
            }

            // 오염(레드, 그린, 옐로) 자동 랜덤 생성 (플레이어 수에 따라 반복, 확률 0.1)
            for(let i=0; i<(_players.length + 2); i++) {
                let colorId = i % 3; // 0: red, 1: green, 2: yellow
                let texture = colorId == 0 ? red : (colorId == 1 ? green : yellow);
                if(Math.random() < 0.1) {
                    let rx = Math.floor(Math.random() * Map.width);
                    let ry = Math.floor(Math.random() * Map.height);
                    let key = ry * HEIGHT_KEY + rx;
                    // 2: blue, 3: red, 4: green, 5: yellow
                    // 이미 다른 오염 타일이면 덮지 않음
                    if(_objects[key] === 2) {
                        // 깨끗한 곳만 오염이 덮을 수 있음
                        _playerScore--;
                        _objects[key] = colorId + 3; // 3: red, 4: green, 5: yellow
                        _pollutionScore++;
                        Map.putObject(rx, ry, texture, { overlap: true });
                    }
                }
            }

            // time over
            if(_timer <= 0)
            {
                if(_pollutionScore > _playerScore)
                {
                    for(let i in _players) {
                        let p = _players[i];
                        p.title = null;
                        p.sprite = tomb;
                        p.moveSpeed = 0;
                        p.sendUpdated();
                    }
                    _resultStr = '오염 VS player\n' + _pollutionScore + "  VS  " + _playerScore + '\n오염 승리';
                }
                else if(_pollutionScore < _playerScore)
                {
                    for(let i in _players) {
                        let p = _players[i];
                        p.title = null;
                        p.sprite = tomb;
                        p.moveSpeed = 0;
                        p.sendUpdated();
                    }
                    _resultStr = '오염 VS player\n' + _pollutionScore + "  VS  " + _playerScore + '\nplayer 승리';
                }
                else
                {
                    for(let i in _players) {
                        let p = _players[i];
                        p.title = null;
                        p.sprite = null;
                        p.sendUpdated();
                    }
                    _resultStr = '오염 VS player\n' + _pollutionScore + "  VS  " + _playerScore + '\n무승부';
                }
                startState(STATE_JUDGE);
            }
            else
            {
                for(let i in _players) {
                    let p = _players[i];

                    // 플레이어가 오염 타일 위에 올라가면 청소(블루로 덮어쓰기)
                    if(p.tag.x != p.tileX || p.tag.y != p.tileY) {
                        p.tag.x = p.tileX;
                        p.tag.y = p.tileY;

                        let key = p.tileY * HEIGHT_KEY + p.tileX;
                        let oldValue = _objects[key];
                        if(oldValue === 2) continue; // 이미 깨끗하면 패스

                        if(oldValue === 3 || oldValue === 4 || oldValue === 5) _pollutionScore--;
                        if(oldValue === 2) _playerScore--;

                        _playerScore++;
                        _objects[key] = 2; // 깨끗하게

                        Map.putObject(p.tileX, p.tileY, blue, { overlap: true });
                    }
                }
            }
            break;
        case STATE_JUDGE:
            App.showCenterLabel(_resultStr);
            if(_stateTimer >= 5)
            {
                startState(STATE_END);
            }
            break;
        case STATE_END:
            break;
    }
});