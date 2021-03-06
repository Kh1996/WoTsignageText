//Lチカ用にLEDポートのためのグローバル変数を定義
var ledPort;

// task.js ライブラリ
const { spawn, sleep } = task;
// document 内のリソースが読み終わるのを待つ
document.addEventListener("DOMContentLoaded", () => {
  
  // task.js の spawn 関数内では Promise が同期的に記述できる
  spawn(function() {
    // GPIO へのアクセサを取得
    const gpioAccessor = yield navigator.requestGPIOAccess();
    //GPIO198(CHIRIMEN CN1-9)をLチカ用のGPIOポートとして利用する
    ledPort = gpioAccessor.ports.get(198);
    //ledPortを出力として利用する
    yield ledPort.export("out");
    
    //GPIO199(CHIRIMEN CN1-10)をタクトスイッチ用のGPIOポート  
    var btnPort = gpioAccessor.ports.get(199);
    //btnPortを入力として利用する
    yield btnPort.export("in");
    //btnPortの値に変化があった時(タクトスイッチが押された時)の処理を規定
    btnPort.onchange = (btnValue) => {
      //コンソールにメッセージを出力
      console.log("pushed!!",btnValue);
    }

    //リンクをクリックした時のイベントを設定する関数
    addEventLink();
    
    // I2C へのアクセサを取得
    const accessor = yield navigator.requestI2CAccess();
    // I2C 0 ポートを使うので、0 を指定してポートを取得
    const port = accessor.ports.get(0);
    // SRF02 超音波センサの初期アドレス 0x70 を指定して slave オブジェクトを取得
    const slave = yield port.open(0x70);
    //ループ
    setInterval( ()=>{
      spawn(function(){
        
        const distance = yield getDistance(port,0x70);

        // 確認用に console.log に表示
        console.log(distance);
        // HTML 画面に距離を表示
        document.querySelector("#distance").textContent = distance;
      });
    },1000);
  });

});

function addEventLink(){
  //ドキュメント内のaタグを全て取得
  Array.from(document.querySelectorAll("a"),  (e) => {
    //取得した要素(aタグ)にtouchstartイベントを設定(CHIRIMENではマウスイベントはtouchイベントに置き換えられる)
    e.addEventListener("touchstart",()=>{
      //LEDを点灯させる
      ledPort.write(1);
      //一致時間(1000ミリ秒)後の処理を記述
      setTimeout(()=>{
        //LEDを消灯させる
        ledPort.write(0);
      },1000);
    });
  });
}

function getDistance(port,addr){
  return new Promise(function(resolve,reject){
    spawn(function(){
      const slave = yield port.open(addr);
      
      // ここからは各 I2C デバイスによって制御方法が異なる
      // SRF02 では以下のようにして距離を取得
      yield slave.write8(0x00, 0x00);
      yield sleep(1);
      slave.write8(0x00, 0x51);
      yield sleep(70);
      const highBit = yield slave.read8(0x02, true);
      const lowBit = yield slave.read8(0x03, true);
      
      const distance = (highBit << 8) + lowBit;
      resolve(distance);
    
    });
  });
}