import * as THREE from 'three'
import { PhysicsWorld } from '../physics/PhysicsWorld'
import { SimpleCar } from '../physics/SimpleCar'

export class GameScene {
  constructor(container) {
    // 初始化场景
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87CEEB) // 天蓝色背景
    
    // 初始化渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)
    
    // 初始化摄像机
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.camera.position.set(0, 10, 20)
    this.camera.lookAt(0, 0, 0)
    
    // 初始化轨道控制参数
    this.orbit = {
      enabled: false,
      lastX: 0,
      lastY: 0,
      theta: 0, // 水平角
      phi: -60 * Math.PI / 180, // 垂直角，初始60度
      radius: 12, // 摄像机距离
      targetTheta: 0, // 目标水平角
      targetPhi: -60 * Math.PI / 180, // 目标垂直角
      lerpFactor: 0.05 // 视角平滑过渡系数
    }
    
    // 初始化简单车辆
    this.simpleCar = new SimpleCar(this.scene)
    this.cameraTarget = this.simpleCar.car
    
    // 添加环境光和平行光
    this.setupLights()
    
    // 创建地面
    this.createGround()
    
    // 处理窗口大小变化
    window.addEventListener('resize', this.onWindowResize.bind(this))
    
    // 添加键盘控制
    this.keys = {}
    window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true)
    window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false)
    
    // 鼠标事件监听
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this))
    window.addEventListener('mousemove', this.onMouseMove.bind(this))
    window.addEventListener('mouseup', this.onMouseUp.bind(this))
    this.renderer.domElement.addEventListener('wheel', this.onMouseWheel.bind(this))
    
    // 开始动画循环
    this.clock = new THREE.Clock()
    this.animate()
  }
  
  setupLights() {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    this.scene.add(ambientLight)
    
    // 平行光（模拟太阳光）
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(50, 50, 50)
    directionalLight.castShadow = true
    
    // 设置阴影属性
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 500
    directionalLight.shadow.camera.left = -100
    directionalLight.shadow.camera.right = 100
    directionalLight.shadow.camera.top = 100
    directionalLight.shadow.camera.bottom = -100
    
    this.scene.add(directionalLight)
  }
  
  createGround() {
    // 创建地面几何体
    const groundGeometry = new THREE.PlaneGeometry(100, 100)
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a472a, // 深绿色
      roughness: 0.8,
      metalness: 0.2
    })
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2 // 使地面水平
    ground.receiveShadow = true
    this.scene.add(ground)
    
    // 添加网格辅助线（开发时使用）
    const gridHelper = new THREE.GridHelper(100, 100)
    this.scene.add(gridHelper)
  }
  
  onMouseDown(event) {
    this.orbit.enabled = true
    this.orbit.lastX = event.clientX
    this.orbit.lastY = event.clientY
  }

  onMouseMove(event) {
    if (!this.orbit.enabled) return
    const dx = event.clientX - this.orbit.lastX
    const dy = event.clientY - this.orbit.lastY
    this.orbit.lastX = event.clientX
    this.orbit.lastY = event.clientY
    // 水平旋转（绕Y轴）
    this.orbit.theta -= dx * 0.01
    // 垂直旋转（绕X轴），限制范围
    this.orbit.phi -= dy * 0.01
    this.orbit.phi = Math.max(10 * Math.PI / 180, Math.min(80 * Math.PI / 180, this.orbit.phi))
    
  }

  onMouseUp() {
    this.orbit.enabled = false
  }
  
  onMouseWheel(event) {
    event.preventDefault()
    // 计算缩放因子
    let scale = 1 - event.deltaY * 0.001
    // 计算新的半径
    let newRadius = this.orbit.radius * scale
    // 限制范围（0.3~2倍初始距离15）
    newRadius = Math.max(15 * 0.3, Math.min(15 * 2, newRadius))
    this.orbit.radius = newRadius
  }
  
  updateCamera() {
    if (this.cameraTarget) {
      // 获取车辆位置和朝向
      const position = this.cameraTarget.position.clone()
      const carRotation = this.cameraTarget.rotation.y
      
      // 根据车辆速度判断前进/后退状态
      const speed = this.simpleCar.speed
      const isReversing = speed < -0.1
      
      // 计算目标视角
      if (Math.abs(speed) > 0.1) {
        // 根据车辆朝向和前进/后退状态计算目标水平角
        this.orbit.targetTheta = carRotation + (isReversing ? Math.PI : 0)
        
        // 根据速度调整垂直角，速度越快视角越高
        const speedFactor = Math.min(Math.abs(speed) / this.simpleCar.maxSpeed, 1)
        this.orbit.targetPhi = (-60 + speedFactor * 20) * Math.PI / 180
      }
      
      // 平滑过渡到目标视角
      this.orbit.theta += (this.orbit.targetTheta - this.orbit.theta) * this.orbit.lerpFactor
      this.orbit.phi += (this.orbit.targetPhi - this.orbit.phi) * this.orbit.lerpFactor
      
      // 限制垂直视角范围
      this.orbit.phi = Math.max(-80 * Math.PI / 180, Math.min(-60 * Math.PI / 180, this.orbit.phi))
      
      // 计算摄像机位置
      const x = position.x + this.orbit.radius * Math.sin(this.orbit.phi) * Math.sin(this.orbit.theta)
      const y = position.y + this.orbit.radius * Math.cos(this.orbit.phi)
      const z = position.z + this.orbit.radius * Math.sin(this.orbit.phi) * Math.cos(this.orbit.theta)
      
      // 平滑移动摄像机
      this.camera.position.lerp(new THREE.Vector3(x, y, z), 0.15)
      
      // 让摄像机看向车辆
      this.camera.lookAt(position)
    }
  }
  
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }
  
  handleInput() {
    // 检查是否为移动设备
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    // 只在非移动设备上处理键盘输入
    if (!isMobile) {
      const steeringSpeed = 0.5;
      const wheelRotationSpeed = 2.0;
      
      // 处理转向
      if (this.keys['a'] || this.keys['arrowleft']) {
        this.simpleCar.setSteering(Math.min(this.simpleCar.steeringAngle + steeringSpeed * 0.016, Math.PI / 4));
      } else if (this.keys['d'] || this.keys['arrowright']) {
        this.simpleCar.setSteering(Math.max(this.simpleCar.steeringAngle - steeringSpeed * 0.016, -Math.PI / 4));
      } else {
        // 自动回正
        if (this.simpleCar.steeringAngle > 0) {
          this.simpleCar.setSteering(Math.max(0, this.simpleCar.steeringAngle - steeringSpeed * 0.016));
        } else if (this.simpleCar.steeringAngle < 0) {
          this.simpleCar.setSteering(Math.min(0, this.simpleCar.steeringAngle + steeringSpeed * 0.016));
        }
      }
      
      // 处理轮子旋转
      if (this.keys['w'] || this.keys['arrowup']) {
        this.simpleCar.setWheelRotation(wheelRotationSpeed);
      } else if (this.keys['s'] || this.keys['arrowdown']) {
        this.simpleCar.setWheelRotation(-wheelRotationSpeed);
      } else {
        this.simpleCar.setWheelRotation(0);
      }
    }
  }
  
  animate() {
    requestAnimationFrame(this.animate.bind(this))
    
    const deltaTime = this.clock.getDelta()
    
    // 处理输入
    this.handleInput()
    
    // 更新车辆
    this.simpleCar.update(deltaTime)
    
    // 更新摄像机
    this.updateCamera()
    
    // 渲染场景
    this.renderer.render(this.scene, this.camera)
  }
  
  // 清理资源
  dispose() {
    window.removeEventListener('resize', this.onWindowResize)
    this.renderer.dispose()
    // 移除鼠标事件
    this.renderer.domElement.removeEventListener('mousedown', this.onMouseDown)
    window.removeEventListener('mousemove', this.onMouseMove)
    window.removeEventListener('mouseup', this.onMouseUp)
    this.renderer.domElement.removeEventListener('wheel', this.onMouseWheel)
  }
} 