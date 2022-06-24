'use strict';


const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

let map, mapEvent;

class Workout {
    date = new Date()
    id = (Date.now() + '').slice(-10)
    clicks = 0;

    constructor (coords, distance, duration){
        // this.id = ...App
        // this.date = ...
        this.coords = coords
        this.distance = distance
        this.duration = duration
    }

    click() {
        this.clicks ++;
    }
    
    _setDescription() {
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]}${this.date.getDate()}`
    }

}

class Running extends Workout {
    type = "running"
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration)
        this.cadence = cadence
        this.calcPace()
        this._setDescription()
    }

    calcPace() {
        this.pace = this.duration / this.distance
        return this.pace
    }
}

class Cycling extends Workout {
    type = "cycling"
    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration)
        this.elevationGain = elevationGain
        this.calcSpeed()
        this._setDescription()
    }

    calcSpeed() {
       this.speed = this.distance / (this.duration / 60)
       return this.speed
    } 
    
}

const run1 = new Running([26.2114566, 127.6766457], 2, 60, 100)
const cycle1 = new Cycling([26.2114566, 127.6766457], 3, 30, 540)

// console.log(run1)
// console.log(cycle1)

class App {
    #map;
    #mapEvent;
    #workouts = [];
    #mapZoomLevel = 13;

    constructor() {
        this._getPosition();
        this._getLocalStrage();
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField)

        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this))
    }

    _getPosition() {
        if(navigator.geolocation) 
        navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function() {
                alert(`could not get your position`)
            }
            )
    
    }
    _loadMap(position) {
            // console.log(position)
            const latitude = position.coords.latitude
            const longitude = position.coords.longitude
            // console.log(`https://www.google.co.jp/maps/@${latitude},${longitude},14z?hl=ja`)

            const coords = [latitude, longitude]
            // console.log(this) //コールバック元からbindしてthisを持ってくる。中身はAppオブジェクト
            this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

            // console.log(map)

            L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(this.#map);
            
            this.#map.on('click', this._showForm.bind(this))

            // ローカルストレージに保存したworkoutをMap展開後に配置。
            this.#workouts.forEach(work => {
                this._renderWorkoutMarker(work)
            })
    }
    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove('hidden')
        inputDistance.focus()
    }

    _hideForm() {
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = "";
        form.style.display = `none`
        form.classList.add('hidden')
        setTimeout(() =>    form.style.display = 'grid', 1000)
    }

    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden')
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden')
    }
    _newWorkout(e) {
        //受け取った内容をチェックする処理
        const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
        const allPositive = (...inputs) => inputs.every(inp => inp > 0)

        e.preventDefault()


        //formの内容を受け取る処理
        const type = inputType.value
        const distance = +inputDistance.value  //数値に変換の為＋を付ける
        const duration = +inputDuration.value
        const { lat, lng } = this.#mapEvent.latlng
        let workout;

        // Runオブジェクトの生成
        if(type === 'running'){
            const cadence = +inputCadence.value
            if(!validInputs(distance, duration, cadence) ||
               !allPositive(distance,duration,cadence)) 
                return alert('整数を入力してください');
            
            workout = new Running([lat, lng], distance, duration, cadence)
        }  
        // cycleオブジェクトの生成
        if(type === 'cycling'){
            const elevation = +inputElevation.value
            if(!validInputs(distance, duration, elevation) ||
               !allPositive(distance, duration))
            return alert('整数を入力してください');

            workout = new Cycling([lat, lng], distance, duration, elevation)
        }
        // オブジェクトをオブジェクト配列に追加.value
        this.#workouts.push(workout)

        //マーカーをレンダリングする
        this._renderWorkoutMarker(workout)

        //リストをレンダリングする
        this._renderWorkout(workout);

        //フォームの内容をlocalstrageに保存する処理
        this._setLocalStrage()

        //リストとフォームを非表示に戻す処理
        this._hideForm()
    }
    _renderWorkoutMarker(workout) {
        //makerをMap上に配置
        L.marker(workout.coords)
        // L.marker([this.#mapEvent.latlng['lat'], this.#mapEvent.latlng['lng']])
        .addTo(this.#map)
        .bindPopup(
            L.popup({
                maxWidth: 250,
                minWidth: 100,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`
            })
        )
        .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : ' 🚴‍♀️'}${workout.description}`)
        .openPopup();
    }

    _renderWorkout(workout) {
        let html =`
         <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">Running on April 14</h2>
        <div class="workout__details">
          <span class="workout__icon">
          ${
              workout.type === 'running' ? '🏃‍♂️' : ' 🚴‍♀️'
            }
          </span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;
        
    if(workout.type === 'running')
        html += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
        </div>
        </li>
        `

    if(workout.type === 'cycling')
    html += `
        <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
    </div>
    </li>
    `

    form.insertAdjacentHTML('afterend', html)
    }

    // クリックしたworkoutの位置にsetView()を設定し移動する
    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout')

        if(!workoutEl) return

        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id)

        // console.log(workout)

        this.#map.setView(workout.coords, this.#mapZoomLevel, {animate: true, pan: {duration: 1},
        })

        //// ページをリロードした際、オブジェクトは引き継がないためクリック数プロパティは存在しないことになる
        // workout.click();
    }

    _setLocalStrage(){
        localStorage.setItem('workout', JSON.stringify(this.#workouts))
    }

    _getLocalStrage(){
        const data = JSON.parse(localStorage.getItem('workout'))

        if(!data) return;

        this.#workouts = data;

        this.#workouts.forEach(work => {
            this._renderWorkout(work)
        })
    }

    reset() {
        localStorage.removeItem('workout');
        location.reload();
      }
}

const app1 = new App();

        
        