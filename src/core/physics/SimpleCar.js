import * as THREE from 'three';

export class SimpleCar {
    constructor(scene) {
        this.scene = scene;
        this.car = new THREE.Group();
        this.wheels = [];
        this.steeringAngle = 0; // 当前前轮转向角
        this.targetSteering = 0; // 目标转向角
        this.wheelRotation = 0; // 轮子自转速度
        this.speed = 0; // 车速（米/秒）
        this.maxSpeed = 12; // 最大速度（米/秒）
        this.acceleration = 4; // 加速度
        this.deceleration = 0.001; // 松开油门时减速度
        this.brakeDeceleration = 10; // 倒车/刹车减速度
        this.steeringSpeed = Math.PI * 5; // 降低转向角变化速度，使转向更平滑
        this.maxSteering = Math.PI / 3; // 保持最大转向角45度
        this.wheelBase = 2.5; // 轴距
        this.car.position.set(0, 0, 0);
        this.car.rotation.y = 0;
        this.groundLimit = 49; // 地面边界（正负50内）
        this.createCar();
        this.scene.add(this.car);
        this.isReversing = false; // 是否倒车
    }

    createCar() {
        // 车身高度0.5，轮子半径0.4，车身底部应在y=0.4
        const bodyGeometry = new THREE.BoxGeometry(2, 0.5, 4);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.castShadow = true;
        this.body.receiveShadow = true;
        this.body.position.y = 0.4 + 0.5 / 2; // 车身底部贴在轮子上
        this.car.add(this.body);

        // 轮子参数
        const wheelRadius = 0.4;
        const wheelWidth = 0.2;
        const wheelGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 32);
        const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 });

        // 前轮用Group包裹，便于转向
        this.frontLeftGroup = new THREE.Group();
        this.frontRightGroup = new THREE.Group();

        // 前左轮
        const frontLeftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        frontLeftWheel.rotation.z = Math.PI / 2;
        frontLeftWheel.position.set(0, 0, 0);
        frontLeftWheel.castShadow = true;
        frontLeftWheel.receiveShadow = true;
        this.frontLeftGroup.add(frontLeftWheel);
        this.frontLeftGroup.position.set(-1, wheelRadius, 1.5);
        this.car.add(this.frontLeftGroup);

        // 前右轮
        const frontRightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        frontRightWheel.rotation.z = Math.PI / 2;
        frontRightWheel.position.set(0, 0, 0);
        frontRightWheel.castShadow = true;
        frontRightWheel.receiveShadow = true;
        this.frontRightGroup.add(frontRightWheel);
        this.frontRightGroup.position.set(1, wheelRadius, 1.5);
        this.car.add(this.frontRightGroup);

        // 后左轮
        const rearLeftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        rearLeftWheel.rotation.z = Math.PI / 2;
        rearLeftWheel.position.set(-1, wheelRadius, -1.5);
        rearLeftWheel.castShadow = true;
        rearLeftWheel.receiveShadow = true;
        this.car.add(rearLeftWheel);

        // 后右轮
        const rearRightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        rearRightWheel.rotation.z = Math.PI / 2;
        rearRightWheel.position.set(1, wheelRadius, -1.5);
        rearRightWheel.castShadow = true;
        rearRightWheel.receiveShadow = true;
        this.car.add(rearRightWheel);

        // 记录轮子，便于动画
        this.wheels = [frontLeftWheel, frontRightWheel, rearLeftWheel, rearRightWheel];
        this.frontWheels = [this.frontLeftGroup, this.frontRightGroup];
    }

    update(deltaTime) {
        // 1. 渐进转向
        const steerDelta = this.steeringSpeed * deltaTime;
        if (this.steeringAngle < this.targetSteering) {
            this.steeringAngle = Math.min(this.steeringAngle + steerDelta, this.targetSteering);
        } else if (this.steeringAngle > this.targetSteering) {
            this.steeringAngle = Math.max(this.steeringAngle - steerDelta, this.targetSteering);
        }

        // 2. 车身移动和转向物理
        if (Math.abs(this.speed) > 0.01) {
            // 计算转弯半径
            const beta = Math.tan(this.steeringAngle) * this.speed / this.wheelBase;
            this.car.rotation.y += beta * deltaTime;
            // 计算前进方向
            const forward = new THREE.Vector3(Math.sin(this.car.rotation.y), 0, Math.cos(this.car.rotation.y));
            this.car.position.add(forward.multiplyScalar(this.speed * deltaTime));
        }
        // 3. 轮子动画
        // 前轮转向
        this.frontLeftGroup.rotation.y = this.steeringAngle;
        this.frontRightGroup.rotation.y = this.steeringAngle;
        // 所有轮子自转
        this.wheels.forEach(wheel => {
            wheel.rotation.x += this.wheelRotation * deltaTime;
        });
        // 4. 简单阻力和倒车逻辑
        if (this.isReversing) {
            if (this.wheelRotation !== 0) {
                this.speed -= this.acceleration * deltaTime;
                this.speed = Math.max(-this.maxSpeed / 2, this.speed); // 倒车最大速度一半
            } else {
                // 松开S时倒车自动减速
                if (this.speed < -0.01) {
                    this.speed += this.brakeDeceleration * deltaTime;
                    if (this.speed > 0) this.speed = 0;
                }
            }
        } else {
            if (Math.abs(this.speed) > 0.01 && this.wheelRotation === 0) {
                // 松开油门时自动减速
                const sign = this.speed > 0 ? 1 : -1;
                this.speed -= sign * this.deceleration * deltaTime;
                if (sign * this.speed < 0) this.speed = 0;
            }
        }
        // 5. 边界碰撞检测
        const p = this.car.position;
        let hit = false;
        if (p.x < -this.groundLimit) { p.x = -this.groundLimit; hit = true; }
        if (p.x > this.groundLimit) { p.x = this.groundLimit; hit = true; }
        if (p.z < -this.groundLimit) { p.z = -this.groundLimit; hit = true; }
        if (p.z > this.groundLimit) { p.z = this.groundLimit; hit = true; }
        if (hit) this.speed = 0;
    }

    setSteering(value) {
        // 直接设置目标转向角，让 update 方法处理平滑过渡
        this.targetSteering = Math.max(-this.maxSteering, Math.min(this.maxSteering, value));
    }

    setWheelRotation(value) {
        // 直接设置轮子旋转速度，让 update 方法处理平滑过渡
        this.wheelRotation = value;
        
        // console.log('轮子旋转速度:', value);
        // 根据轮子旋转速度计算加速度
        const accelerationFactor = Math.abs(value) * this.acceleration;
        
        // 正常前进
        if (value > 0) {
            this.isReversing = false;
            this.speed += accelerationFactor * 0.016;
            this.speed = Math.min(this.maxSpeed, this.speed);
            // console.log('前进速度:', this.speed);
        }
        // 倒车逻辑
        else if (value <= 0) {
            // 如果速度为正（向前），先减速到0
            if (this.speed > 0.01) {
                this.speed -= this.brakeDeceleration * 0.016;
                if (this.speed < 0) this.speed = 0;
                // console.log('减速速度:', this.speed);
            }
            // 速度接近0时，开始倒车
            else if (this.speed <= 0.01) {  // 修改判断条件
                this.isReversing = true;
                this.speed -= accelerationFactor * 0.016;
                this.speed = Math.max(-this.maxSpeed / 2, this.speed); // 倒车最大速度一半
                // console.log('倒车速度:', this.speed);
            }
        }
        // 松开时不加速，让 update 方法处理减速
    }

    getSpeedKmh() {
        // 返回绝对速度，单位km/h
        return Math.abs(this.speed) * 3.6;
    }
} 