import * as THREE from 'three';
import defaultConfig from './CarConfig.sample.json';

export class SimpleCar {
    // 1. Add a defaultConfig static property for fallback
    static defaultConfig = defaultConfig;

    constructor(scene, config = null) {
        this.scene = scene;
        // 如果提供了config，使用提供的config，否则使用默认配置
        this.config = config || SimpleCar.defaultConfig;
        this.car = new THREE.Group();
        this.wheels = [];
        this.steeringAngle = 0; // 当前前轮转向角
        this.targetSteering = 0; // 目标转向角
        this.wheelRotation = 0; // 轮子自转速度
        this.speed = 0; // 车速（米/秒）
        this.maxSpeed = 12; // 最大速度（米/秒）
        this.acceleration = 4; // 加速度
        this.deceleration = 0.001; // 松开油门时减速度
        this.brakeDeceleration = 1; // 倒车/刹车减速度
        this.brakingDeceleration = 20; // 刹车时的减速度，设置为一个较大的固定值
        this.steeringSpeed = Math.PI * 5; // 降低转向角变化速度，使转向更平滑
        this.maxSteering = Math.PI / 3; // 保持最大转向角45度
        this.wheelBase = 2.5; // 轴距
        this.car.position.set(0, 0, 0);
        this.car.rotation.y = 0;
        this.groundLimit = 49; // 地面边界（正负50内）
        this.createCar();
        this.scene.add(this.car);
        this.isReversing = false; // 是否倒车
        this.isBraking = false; // 是否在刹车
        this.taillights = []; // 存储尾灯对象的数组
        this.cannonballs = []; // 存储所有炮弹
        this.lastFireTime = 0; // 上次发射时间
        this.fireInterval = 0.1; // 发射间隔（秒）
        this.cannonballSpeed = 100; // 炮弹初始速度
        this.cannonballRadius = 0.2; // 炮弹半径
        this.gravity = 9.8; // 重力加速度
    }

    // 添加一个方法来重新加载配置
    reloadConfig(config) {
        this.config = config;
        // 重新创建车辆
        while (this.car.children.length > 0) {
            this.car.remove(this.car.children[0]);
        }
        this.createCar();
    }

    createCar() {
        // Remove old car parts if re-creating
        while (this.car.children.length > 0) {
            this.car.remove(this.car.children[0]);
        }
        // Helper: create a box mesh from config
        const createBox = (cfg) => {
            if (!cfg.size) {
                console.warn('Box config missing size:', cfg);
                return null;
            }
            const geo = new THREE.BoxGeometry(...cfg.size);
            const mat = new THREE.MeshPhongMaterial({ color: cfg.color, transparent: !!cfg.opacity, opacity: cfg.opacity ?? 1 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(...cfg.position);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            return mesh;
        };
        // Helper: create a cylinder mesh from config
        const createCylinder = (cfg, axis = 'x') => {
            const geo = new THREE.CylinderGeometry(cfg.radius, cfg.radius, cfg.height, 32);
            const mat = new THREE.MeshPhongMaterial({ color: cfg.color, transparent: !!cfg.opacity, opacity: cfg.opacity ?? 1 });
            const mesh = new THREE.Mesh(geo, mat);
            if (axis === 'x') mesh.rotation.x = Math.PI / 2;
            if (cfg.position) mesh.position.set(...cfg.position);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            return mesh;
        };
        // 1. Body
        if (this.config.body) {
            const body = createBox(this.config.body);
            this.body = body;
            this.car.add(body);
        }
        // 2. Chassis
        if (this.config.chassis) {
            const chassis = createBox(this.config.chassis);
            this.chassis = chassis;
            this.car.add(chassis);
        }
        // 3. Arch (array)
        if (Array.isArray(this.config.arch)) {
            this.config.arch.forEach(cfg => {
                const mesh = createBox(cfg);
                if (mesh instanceof THREE.Object3D) this.car.add(mesh);
            });
        }
        // 4. Roof
        if (this.config.roof) {
            const mesh = createBox(this.config.roof);
            if (mesh instanceof THREE.Object3D) this.car.add(mesh);
        }
        // 5. Hood
        if (this.config.hood) {
            const mesh = createBox(this.config.hood);
            if (mesh instanceof THREE.Object3D) this.car.add(mesh);
        }
        // 6. Trunk
        if (this.config.trunk) {
            const mesh = createBox(this.config.trunk);
            if (mesh instanceof THREE.Object3D) this.car.add(mesh);
        }
        // 7. Bumpers (array)
        if (Array.isArray(this.config.bumpers)) {
            this.config.bumpers.forEach(cfg => {
                const mesh = createBox(cfg);
                if (mesh instanceof THREE.Object3D) this.car.add(mesh);
            });
        }
        // 8. Wheels (special: still用原有分组逻辑)
        if (this.config.wheel) {
            const wheelRadius = this.config.wheel.radius;
            const wheelWidth = this.config.wheel.width;
            const wheelColor = this.config.wheel.color;
            const wheelGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 32);
            const wheelMaterial = new THREE.MeshPhongMaterial({ color: wheelColor });
            // Front left wheel (in group for steering)
            const frontLeftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            frontLeftWheel.rotation.z = Math.PI / 2;
            frontLeftWheel.position.set(0, 0, 0); // Local to group
            frontLeftWheel.castShadow = true;
            frontLeftWheel.receiveShadow = true;
            // Front right wheel (in group for steering)
            const frontRightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            frontRightWheel.rotation.z = Math.PI / 2;
            frontRightWheel.position.set(0, 0, 0); // Local to group
            frontRightWheel.castShadow = true;
            frontRightWheel.receiveShadow = true;
            // Rear left wheel (directly to car)
            const rearLeftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            rearLeftWheel.rotation.z = Math.PI / 2;
            rearLeftWheel.position.set(-1, wheelRadius, -1.5);
            rearLeftWheel.castShadow = true;
            rearLeftWheel.receiveShadow = true;
            this.car.add(rearLeftWheel);
            // Rear right wheel (directly to car)
            const rearRightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            rearRightWheel.rotation.z = Math.PI / 2;
            rearRightWheel.position.set(1, wheelRadius, -1.5);
            rearRightWheel.castShadow = true;
            rearRightWheel.receiveShadow = true;
            this.car.add(rearRightWheel);
            // Front wheels group for steering
            this.frontLeftGroup = new THREE.Group();
            this.frontLeftGroup.add(frontLeftWheel);
            this.frontLeftGroup.position.set(-1, wheelRadius, 1.5);
            this.car.add(this.frontLeftGroup);
            this.frontRightGroup = new THREE.Group();
            this.frontRightGroup.add(frontRightWheel);
            this.frontRightGroup.position.set(1, wheelRadius, 1.5);
            this.car.add(this.frontRightGroup);
            // Wheels array for animation (only mesh, not group)
            this.wheels = [frontLeftWheel, frontRightWheel, rearLeftWheel, rearRightWheel];
            this.frontWheels = [this.frontLeftGroup, this.frontRightGroup];
        }
        // 9. Headlights (array, cylinder)
        if (Array.isArray(this.config.headlight)) {
            this.config.headlight.forEach(cfg => {
                const mesh = createCylinder(cfg, 'x');
                if (mesh instanceof THREE.Object3D) this.car.add(mesh);
            });
        }
        // 10. Taillights (array, box)
        if (Array.isArray(this.config.taillight)) {
            this.taillights = []; // 清空尾灯数组
            this.config.taillight.forEach(cfg => {
                const mesh = createBox({ ...cfg, opacity: 1 });
                if (mesh instanceof THREE.Object3D) {
                    this.car.add(mesh);
                    this.taillights.push(mesh); // 将尾灯对象添加到数组中
                }
            });
        }
        // 11. Windows (array, box)
        if (Array.isArray(this.config.window)) {
            this.config.window.forEach(cfg => {
                const mesh = createBox(cfg);
                if (mesh instanceof THREE.Object3D) this.car.add(mesh);
            });
        }
        // 12. Mirrors (array, box)
        if (Array.isArray(this.config.mirror)) {
            this.config.mirror.forEach(cfg => {
                const mesh = createBox(cfg);
                if (mesh instanceof THREE.Object3D) this.car.add(mesh);
            });
        }
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
        
        // 更新所有炮弹的位置
        for (let i = this.cannonballs.length - 1; i >= 0; i--) {
            const cannonball = this.cannonballs[i];
            const currentTime = performance.now() / 1000;
            const timeElapsed = currentTime - cannonball.userData.initialTime;

            // 更新炮弹位置（考虑重力和初始速度）
            // 水平方向：匀速运动
            cannonball.position.x = cannonball.userData.initialPosition.x + 
                cannonball.userData.velocity.x * timeElapsed;
            cannonball.position.z = cannonball.userData.initialPosition.z + 
                cannonball.userData.velocity.z * timeElapsed;
            
            // 垂直方向：考虑重力影响
            // 使用物理公式：h = h0 + v0*t + 0.5*g*t^2
            cannonball.position.y = cannonball.userData.initialPosition.y - 
                0.5 * this.gravity * timeElapsed * timeElapsed;

            // 如果炮弹落到地面以下，则移除
            if (cannonball.position.y < -1) {
                this.scene.remove(cannonball);
                this.cannonballs.splice(i, 1);
            }
        }
    }

    setSteering(value) {
        // 直接设置目标转向角，让 update 方法处理平滑过渡
        this.targetSteering = Math.max(-this.maxSteering, Math.min(this.maxSteering, value));
    }

    setWheelRotation(value) {
        // 直接设置轮子旋转速度，让 update 方法处理平滑过渡
        this.wheelRotation = value;
        
        // 判断是否在刹车（当速度不为0且按下与当前运动方向相反的键时）
        this.isBraking = (Math.abs(this.speed) > 0.01) && 
            ((this.speed > 0 && value < 0) || (this.speed < 0 && value > 0));
        
        // 根据轮子旋转速度计算加速度
        const accelerationFactor = Math.abs(value) * this.acceleration;
        
        // 正常前进
        if (value > 0) {
            // 如果正在倒车，先减速到0
            if (this.speed < -0.01) {
                // 如果在刹车状态，使用更大的减速度
                const currentDeceleration = this.isBraking ? this.brakingDeceleration : this.brakeDeceleration;
                this.speed += currentDeceleration * 0.016;
                if (this.speed > 0) this.speed = 0;
            }
            // 速度接近0时，开始前进
            else if (this.speed >= -0.01) {
                this.isReversing = false;
                this.speed += accelerationFactor * 0.016;
                this.speed = Math.min(this.maxSpeed, this.speed);
            }
        }
        // 倒车或刹车逻辑
        else if (value <= 0) {
            // 如果速度为正（向前），先减速到0
            if (this.speed > 0.01) {
                // 如果在刹车状态，使用更大的减速度
                const currentDeceleration = this.isBraking ? this.brakingDeceleration : this.brakeDeceleration;
                this.speed -= currentDeceleration * 0.016;
                if (this.speed < 0) this.speed = 0;
            }
            // 速度接近0时，开始倒车
            else if (this.speed <= 0.01) {
                this.isReversing = true;
                this.speed -= accelerationFactor * 0.016;
                this.speed = Math.max(-this.maxSpeed / 3, this.speed);
            }
        }
    }

    getSpeedKmh() {
        // 返回绝对速度，单位km/h
        return Math.abs(this.speed) * 3.6;
    }

    // 3. Add fromConfig method
    fromConfig(config) {
        this.config = config;
        // Remove old car
        while (this.car.children.length > 0) {
            this.car.remove(this.car.children[0]);
        }
        this.createCar();
    }

    // 发射炮弹
    fireCannonball() {
        const currentTime = performance.now() / 1000; // 转换为秒
        if (currentTime - this.lastFireTime < this.fireInterval) {
            return; // 如果距离上次发射时间不足，则不发射
        }
        this.lastFireTime = currentTime;

        // 创建炮弹几何体
        const geometry = new THREE.SphereGeometry(this.cannonballRadius, 32, 32);
        const material = new THREE.MeshPhongMaterial({ color: 0x000000 });

        // 获取车头灯的位置
        const headlightPositions = [];
        if (Array.isArray(this.config.headlight)) {
            this.config.headlight.forEach(cfg => {
                // 将车头灯的局部坐标转换为世界坐标
                const position = new THREE.Vector3(...cfg.position);
                position.applyMatrix4(this.car.matrixWorld);
                headlightPositions.push(position);
            });
        }

        // 如果没有找到车头灯，使用默认位置
        if (headlightPositions.length === 0) {
            const defaultPosition = this.car.position.clone();
            defaultPosition.y += 0.5;
            headlightPositions.push(defaultPosition);
        }

        // 从每个车头灯发射炮弹
        headlightPositions.forEach(headlightPosition => {
            const cannonball = new THREE.Mesh(geometry, material);

            // 计算发射方向（基于车辆当前朝向）
            const direction = new THREE.Vector3(
                Math.sin(this.car.rotation.y),
                0, // 初始垂直速度为0，让重力影响它
                Math.cos(this.car.rotation.y)
            ).normalize();

            // 设置炮弹初始位置和速度
            cannonball.position.copy(headlightPosition);
            cannonball.userData = {
                velocity: direction.multiplyScalar(this.cannonballSpeed),
                initialTime: currentTime,
                initialPosition: headlightPosition.clone()
            };

            // 添加到场景和炮弹数组
            this.scene.add(cannonball);
            this.cannonballs.push(cannonball);
        });
    }
} 