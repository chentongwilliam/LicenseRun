export class GameControls {
    constructor(car) {
        this.car = car;
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            fire: false
        };
        this.setupKeyboardControls();
        this.setupMobileControls();
    }

    setupKeyboardControls() {
        // 键盘按下事件
        window.addEventListener('keydown', (event) => {
            switch (event.code) {
                case 'KeyW':
                    this.keys.forward = true;
                    break;
                case 'KeyS':
                    this.keys.backward = true;
                    break;
                case 'KeyA':
                    this.keys.left = true;
                    break;
                case 'KeyD':
                    this.keys.right = true;
                    break;
                case 'Space':
                    this.keys.fire = true;
                    break;
            }
        });

        // 键盘释放事件
        window.addEventListener('keyup', (event) => {
            switch (event.code) {
                case 'KeyW':
                    this.keys.forward = false;
                    break;
                case 'KeyS':
                    this.keys.backward = false;
                    break;
                case 'KeyA':
                    this.keys.left = false;
                    break;
                case 'KeyD':
                    this.keys.right = false;
                    break;
                case 'Space':
                    this.keys.fire = false;
                    break;
            }
        });
    }

    setupMobileControls() {
        // 创建发射按钮
        const fireButton = document.createElement('div');
        fireButton.id = 'fireButton';
        fireButton.style.cssText = `
            position: fixed;
            left: 20px;
            bottom: 20px;
            width: 60px;
            height: 60px;
            background-color: rgba(255, 0, 0, 0.5);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            user-select: none;
            touch-action: manipulation;
            z-index: 1000;
        `;
        fireButton.innerHTML = '🔥';
        document.body.appendChild(fireButton);

        // 添加触摸事件
        fireButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.keys.fire = true;
        });

        fireButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.keys.fire = false;
        });
    }

    update() {
        // 处理车辆控制
        if (this.keys.forward) {
            this.car.setWheelRotation(1);
        } else if (this.keys.backward) {
            this.car.setWheelRotation(-1);
        } else {
            this.car.setWheelRotation(0);
        }

        if (this.keys.left) {
            this.car.setSteering(-1);
        } else if (this.keys.right) {
            this.car.setSteering(1);
        } else {
            this.car.setSteering(0);
        }

        // 处理发射控制
        if (this.keys.fire) {
            this.car.fireCannonball();
        }
    }
} 