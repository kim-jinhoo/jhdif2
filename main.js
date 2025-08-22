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
let tomb = App.loadSpritesheet('tomb.png');

let _start = false;
let _gameEnd = false;
let _state = STATE_INIT;
let _stateTimer = 0;
let _timer = 90;

let _objects = {};

let _redScore = 0;
let _blueScore = 0;

// for using hash key
let HEIGHT_KEY = 10000000;

let _blueTeam = [];
let _players = App.players; // App.players : get total players
let _resultStr = '';

let _redPaintTimer = 0; // 레드팀 자동 색칠 타이머

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

            _redScore = 0;
            _blueScore = 0;
            _objects = {};

            _blueTeam = [];
            for(let i in _players) {
                let p = _players[i];
                p.tag = {
                    x: p.tileX,
                    y: p.tileY,
                    sturn : false,
                    sTime : 1,
                    super : false,
                    team: 1, // 모두 블루팀
                };
                _blueTeam.push(p);
                p.sprite = blueman;
                p.nameColor = 255;
                p.sendUpdated();
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

// 모두 블루팀으로 입장
App.onJoinPlayer.Add(function(p) {
    p.tag = {
        x: p.tileX,
        y: p.tileY,
        sturn : false,
        sTime : 1,
        super : false,
        team: 1, // 모두 블루팀
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
});

App.onUnitAttacked.Add(function(sender, x, y, target) {
    if(_state != STATE_PLAYING)
        return;
    if(!target.tag.sturn && !target.tag.super)
    {
        target.tag.sturn = true;
        target.moveSpeed = 0;
        target.sendUpdated();
    }
});

App.onUpdate.Add(function(dt) {
    if(!_start)
        return;

    _stateTimer += dt;

    switch(_state)
    {
        case STATE_INIT:
            App.showCenterLabel("블루팀은 레드 타일을 지우세요!\n레드팀은 자동으로 타일을 칠합니다.");
            if(_stateTimer >= 5)
            {
                startState(STATE_READY);
            }
            break;
        case STATE_READY:
            App.showCenterLabel("곧 게임이 시작됩니다.");
            if(_stateTimer >= 3)
            {
                startState(STATE_PLAYING);
            }
            break;
        case STATE_PLAYING:
            App.showCenterLabel(_timer +  `\nRED(자동)  VS  BLUE(플레이어)\n` + _redScore + "  VS  " + _blueScore);
            if(_stateTimer >= 1) {
                _stateTimer = 0;
                _timer--;
            }

            // 레드팀 자동 랜덤 타일 색칠 (맵 전체 랜덤)
            _redPaintTimer += dt;
            if(_redPaintTimer >= 0.5) { // 0.5초마다 한 번
                _redPaintTimer = 0;
                let x = Math.floor(Math.random() * Map.width);
                let y = Math.floor(Math.random() * Map.height);
                let key = y * HEIGHT_KEY + x;
                // 반드시 기존 타일을 덮어쓰고, _objects에 0(레드)로 저장
                if(_objects[key] !== 0) {
                    if(_objects[key] === 1) _blueScore--;
                    _redScore++;
                    _objects[key] = 0;
                    Map.clearObject(x, y); // 혹시 기존 오브젝트가 남아있을 경우 제거
                    Map.putObject(x, y, red, { overlap: true });
                }
            }

            // time over
            if(_timer <= 0)
            {
                if(_redScore > _blueScore)
                {
                    for(let i in _players) {
                        let p = _players[i];
                        p.title = null;
                        p.sprite = tomb;
                        p.moveSpeed = 0;
                        p.sendUpdated();
                    }
                    _resultStr = 'RED(자동)  VS  BLUE(플레이어)\n' + _redScore + "  VS  " + _blueScore + '\nRED WIN';
                }
                else if(_redScore < _blueScore)
                {
                    for(let i in _players) {
                        let p = _players[i];
                        p.title = null;
                        p.sprite = null;
                        p.moveSpeed = 0;
                        p.sendUpdated();
                    }
                    _resultStr = 'RED(자동)  VS  BLUE(플레이어)\n' + _redScore + "  VS  " + _blueScore + '\nBLUE WIN';
                }
                else
                {
                    for(let i in _players) {
                        let p = _players[i];
                        p.title = null;
                        p.sprite = null;
                        p.sendUpdated();
                    }
                    _resultStr = 'RED(자동)  VS  BLUE(플레이어)\n' + _redScore + "  VS  " + _blueScore + '\nDRAW';
                }
                startState(STATE_JUDGE);
            }
            else
            {
                for(let i in _players) {
                    let p = _players[i];

                    // 스턴/무적 처리
                    if(p.tag.sturn)
                    {
                        p.tag.sTime -= dt;
                        if(p.tag.sTime <= 0)
                        {
                            p.tag.sturn = false;
                            p.tag.super = true;
                            p.tag.sTime = 1;
                            p.moveSpeed = 80;
                            p.sendUpdated();
                        }
                    }
                    if(p.tag.super)
                    {
                        p.tag.sTime -= dt;
                        if(p.tag.sTime <= 0)
                        {
                            p.tag.super = false;
                            p.tag.sTime = 1;
                            p.sendUpdated();
                        }
                    }

                    // 블루팀 플레이어가 레드 타일만 지울 수 있음
                    // 반드시 key 계산이 레드 타일 생성과 동일해야 함
                    if(p.tag.x !== p.tileX || p.tag.y !== p.tileY) {
                        p.tag.x = p.tileX;
                        p.tag.y = p.tileY;
                        let key = p.tileY * HEIGHT_KEY + p.tileX;
                        let oldValue = _objects[key];
                        if(oldValue === 0) { // 레드 타일이면 지움
                            _redScore--;
                            delete _objects[key];
                            Map.clearObject(p.tileX, p.tileY);
                        }
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