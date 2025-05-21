import * as THREE from 'three'
import { PhysicsWorld } from '../physics/PhysicsWorld'
import { SimpleCar } from '../physics/SimpleCar'

export class GameScene {
  constructor(container) {
    // 初始化场景
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xE0F7FF) // 更柔和的天空蓝
    
    // 初始化渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)
    
    // 初始化摄像机
    this.camera = new THREE.PerspectiveCamera(
      75, // 增加视场角，使视野更开阔
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
      theta: 0,
      phi: -45 * Math.PI / 180, // 调整初始视角
      radius: 12, // 改回原来的距离
      targetTheta: 0,
      targetPhi: -45 * Math.PI / 180,
      lerpFactor: 0.1
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
  }
  
  setupLights() {
    // 环境光 - 更柔和的光照
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambientLight)
    
    // 主平行光（模拟太阳光）
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
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

    // 添加补光
    const fillLight = new THREE.DirectionalLight(0xE0F7FF, 0.3)
    fillLight.position.set(-50, 30, -50)
    this.scene.add(fillLight)
  }
  
  createGround() {
    // 创建地面几何体（作为草地）
    const groundGeometry = new THREE.PlaneGeometry(1000, 1000) // 扩大地面尺寸
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x7CB342,
      roughness: 0.8,
      metalness: 0.2
    })
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)
    
    // 创建道路网络
    this.createRoadNetwork()
    
    // 创建建筑物
    this.createBuildings()
  }
  
  createRoadNetwork() {
    const roadWidth = 20
    const roadLength = 800 // 扩大道路长度
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x424242,
      roughness: 0.9,
      metalness: 0.1
    })

    // 创建主干道（南北向）
    const mainRoadNS = new THREE.Mesh(
      new THREE.PlaneGeometry(roadWidth, roadLength),
      roadMaterial
    )
    mainRoadNS.rotation.x = -Math.PI / 2
    mainRoadNS.position.y = 0.01
    mainRoadNS.receiveShadow = true
    this.scene.add(mainRoadNS)

    // 创建主干道（东西向）
    const mainRoadEW = new THREE.Mesh(
      new THREE.PlaneGeometry(roadLength, roadWidth),
      roadMaterial
    )
    mainRoadEW.rotation.x = -Math.PI / 2
    mainRoadEW.position.y = 0.01
    mainRoadEW.receiveShadow = true
    this.scene.add(mainRoadEW)

    // 创建次要道路
    const secondaryRoadPositions = [
      { x: -100, z: 0, width: roadWidth, length: roadLength },
      { x: 100, z: 0, width: roadWidth, length: roadLength },
      { x: 0, z: -100, width: roadLength, length: roadWidth },
      { x: 0, z: 100, width: roadLength, length: roadWidth }
    ]

    secondaryRoadPositions.forEach(pos => {
      const road = new THREE.Mesh(
        new THREE.PlaneGeometry(pos.width, pos.length),
        roadMaterial
      )
      road.rotation.x = -Math.PI / 2
      road.position.set(pos.x, 0.01, pos.z)
      road.receiveShadow = true
      this.scene.add(road)
    })

    // 添加车道线
    this.createRoadLines(roadWidth, roadLength)

    // 添加人行道
    this.createSidewalks(roadWidth, roadLength)

    // 添加交通信号灯
    this.createTrafficLights()

    // 添加路牌
    this.createRoadSigns()
  }

  createRoadLines(roadWidth, roadLength) {
    const lineWidth = 0.2
    const lineLength = roadLength
    const lineGeometry = new THREE.PlaneGeometry(lineWidth, lineLength)
    const lineMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.5,
      metalness: 0.2,
      emissive: 0xFFFFFF,
      emissiveIntensity: 0.2
    })

    // 创建所有道路的中心线和车道线
    const roadPositions = [
      { x: 0, z: 0, isVertical: true },    // 中心南北向
      { x: 0, z: 0, isVertical: false },   // 中心东西向
      { x: -100, z: 0, isVertical: true }, // 西侧南北向
      { x: 100, z: 0, isVertical: true },  // 东侧南北向
      { x: 0, z: -100, isVertical: false },// 南侧东西向
      { x: 0, z: 100, isVertical: false }  // 北侧东西向
    ]

    roadPositions.forEach(pos => {
      // 中心双黄线
      const centerLine1 = new THREE.Mesh(lineGeometry, lineMaterial)
      centerLine1.rotation.x = -Math.PI / 2
      centerLine1.position.set(pos.x - 0.3, 0.02, pos.z)
      if (!pos.isVertical) centerLine1.rotation.z = Math.PI / 2
      this.scene.add(centerLine1)

      const centerLine2 = new THREE.Mesh(lineGeometry, lineMaterial)
      centerLine2.rotation.x = -Math.PI / 2
      centerLine2.position.set(pos.x + 0.3, 0.02, pos.z)
      if (!pos.isVertical) centerLine2.rotation.z = Math.PI / 2
      this.scene.add(centerLine2)

      // 车道分隔线
      const laneLine1 = new THREE.Mesh(lineGeometry, lineMaterial)
      laneLine1.rotation.x = -Math.PI / 2
      laneLine1.position.set(pos.x - 5, 0.02, pos.z)
      if (!pos.isVertical) laneLine1.rotation.z = Math.PI / 2
      this.scene.add(laneLine1)

      const laneLine2 = new THREE.Mesh(lineGeometry, lineMaterial)
      laneLine2.rotation.x = -Math.PI / 2
      laneLine2.position.set(pos.x + 5, 0.02, pos.z)
      if (!pos.isVertical) laneLine2.rotation.z = Math.PI / 2
      this.scene.add(laneLine2)
    })
  }

  createSidewalks(roadWidth, roadLength) {
    const sidewalkWidth = 3
    const sidewalkMaterial = new THREE.MeshStandardMaterial({
      color: 0xE0E0E0,
      roughness: 0.7,
      metalness: 0.1
    })

    // 创建所有道路的人行道
    const roadPositions = [
      { x: 0, z: 0, isVertical: true },    // 中心南北向
      { x: 0, z: 0, isVertical: false },   // 中心东西向
      { x: -100, z: 0, isVertical: true }, // 西侧南北向
      { x: 100, z: 0, isVertical: true },  // 东侧南北向
      { x: 0, z: -100, isVertical: false },// 南侧东西向
      { x: 0, z: 100, isVertical: false }  // 北侧东西向
    ]

    roadPositions.forEach(pos => {
      const sidewalkGeometry = new THREE.PlaneGeometry(
        pos.isVertical ? sidewalkWidth : roadLength,
        pos.isVertical ? roadLength : sidewalkWidth
      )

      // 左侧/上侧人行道
      const leftSidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial)
      leftSidewalk.rotation.x = -Math.PI / 2
      leftSidewalk.position.set(
        pos.x - (pos.isVertical ? roadWidth/2 + sidewalkWidth/2 : 0),
        0.02,
        pos.z - (pos.isVertical ? 0 : roadWidth/2 + sidewalkWidth/2)
      )
      this.scene.add(leftSidewalk)

      // 右侧/下侧人行道
      const rightSidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial)
      rightSidewalk.rotation.x = -Math.PI / 2
      rightSidewalk.position.set(
        pos.x + (pos.isVertical ? roadWidth/2 + sidewalkWidth/2 : 0),
        0.02,
        pos.z + (pos.isVertical ? 0 : roadWidth/2 + sidewalkWidth/2)
      )
      this.scene.add(rightSidewalk)
    })
  }

  createTrafficLights() {
    const trafficLightPositions = [
      { x: -10, z: -10, rotation: 0 },     // 西北角
      { x: 10, z: -10, rotation: Math.PI/2 },  // 东北角
      { x: -10, z: 10, rotation: -Math.PI/2 }, // 西南角
      { x: 10, z: 10, rotation: Math.PI },     // 东南角
      // 添加其他交叉路口的红绿灯
      { x: -110, z: -10, rotation: 0 },
      { x: -90, z: -10, rotation: Math.PI/2 },
      { x: 90, z: -10, rotation: 0 },
      { x: 110, z: -10, rotation: Math.PI/2 },
      { x: -10, z: -110, rotation: -Math.PI/2 },
      { x: 10, z: -110, rotation: Math.PI },
      { x: -10, z: 110, rotation: -Math.PI/2 },
      { x: 10, z: 110, rotation: Math.PI }
    ]

    trafficLightPositions.forEach(pos => {
      // 创建红绿灯杆
      const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 6, 8)
      const poleMaterial = new THREE.MeshStandardMaterial({
        color: 0x424242,
        roughness: 0.8,
        metalness: 0.2
      })
      const pole = new THREE.Mesh(poleGeometry, poleMaterial)
      pole.position.set(pos.x, 3, pos.z)
      pole.rotation.y = pos.rotation
      pole.castShadow = true
      this.scene.add(pole)

      // 创建红绿灯箱
      const boxGeometry = new THREE.BoxGeometry(1, 2, 0.5)
      const boxMaterial = new THREE.MeshStandardMaterial({
        color: 0x212121,
        roughness: 0.7,
        metalness: 0.3
      })
      const box = new THREE.Mesh(boxGeometry, boxMaterial)
      box.position.set(pos.x + Math.cos(pos.rotation) * 0.5, 5, pos.z + Math.sin(pos.rotation) * 0.5)
      box.rotation.y = pos.rotation
      box.castShadow = true
      this.scene.add(box)

      // 创建红绿灯
      const lightGeometry = new THREE.SphereGeometry(0.2, 16, 16)
      const redLight = new THREE.Mesh(lightGeometry, new THREE.MeshStandardMaterial({
        color: 0xFF0000,
        emissive: 0xFF0000,
        emissiveIntensity: 0.5
      }))
      redLight.position.set(pos.x + Math.cos(pos.rotation) * 0.5, 5.5, pos.z + Math.sin(pos.rotation) * 0.5)
      this.scene.add(redLight)

      const yellowLight = new THREE.Mesh(lightGeometry, new THREE.MeshStandardMaterial({
        color: 0xFFFF00,
        emissive: 0xFFFF00,
        emissiveIntensity: 0.5
      }))
      yellowLight.position.set(pos.x + Math.cos(pos.rotation) * 0.5, 5, pos.z + Math.sin(pos.rotation) * 0.5)
      this.scene.add(yellowLight)

      const greenLight = new THREE.Mesh(lightGeometry, new THREE.MeshStandardMaterial({
        color: 0x00FF00,
        emissive: 0x00FF00,
        emissiveIntensity: 0.5
      }))
      greenLight.position.set(pos.x + Math.cos(pos.rotation) * 0.5, 4.5, pos.z + Math.sin(pos.rotation) * 0.5)
      this.scene.add(greenLight)
    })
  }

  createRoadSigns() {
    const signPositions = [
      { x: -15, z: -15, type: 'stop', rotation: 0 },
      { x: 15, z: -15, type: 'yield', rotation: Math.PI/2 },
      { x: -15, z: 15, type: 'speed', rotation: -Math.PI/2 },
      { x: 15, z: 15, type: 'parking', rotation: Math.PI },
      // 添加其他路牌
      { x: -115, z: -15, type: 'stop', rotation: 0 },
      { x: 115, z: -15, type: 'yield', rotation: Math.PI/2 },
      { x: -15, z: -115, type: 'speed', rotation: -Math.PI/2 },
      { x: 15, z: 115, type: 'parking', rotation: Math.PI }
    ]

    signPositions.forEach(pos => {
      // 创建路牌杆
      const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3, 8)
      const poleMaterial = new THREE.MeshStandardMaterial({
        color: 0x424242,
        roughness: 0.8,
        metalness: 0.2
      })
      const pole = new THREE.Mesh(poleGeometry, poleMaterial)
      pole.position.set(pos.x, 1.5, pos.z)
      pole.castShadow = true
      this.scene.add(pole)

      // 创建路牌
      const signGeometry = new THREE.BoxGeometry(1, 0.8, 0.1)
      const signMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        roughness: 0.5,
        metalness: 0.3
      })
      const sign = new THREE.Mesh(signGeometry, signMaterial)
      sign.position.set(
        pos.x + Math.cos(pos.rotation) * 0.5,
        2.5,
        pos.z + Math.sin(pos.rotation) * 0.5
      )
      sign.rotation.y = pos.rotation
      sign.castShadow = true
      this.scene.add(sign)
    })
  }

  createBuildings() {
    // 更新建筑物位置以适应新的地图大小
    const buildingPositions = [
      { x: -150, z: -150, width: 20, height: 30, depth: 20, color: 0xE3F2FD },
      { x: 150, z: -150, width: 20, height: 35, depth: 20, color: 0xF3E5F5 },
      { x: -150, z: 150, width: 20, height: 40, depth: 20, color: 0xE8F5E9 },
      { x: 150, z: 150, width: 20, height: 45, depth: 20, color: 0xFFEBEE },
      { x: -150, z: 0, width: 15, height: 25, depth: 15, color: 0xFFF3E0 },
      { x: 150, z: 0, width: 15, height: 30, depth: 15, color: 0xF1F8E9 },
      { x: 0, z: -150, width: 15, height: 28, depth: 15, color: 0xE0F7FA },
      { x: 0, z: 150, width: 15, height: 32, depth: 15, color: 0xFCE4EC }
    ]

    buildingPositions.forEach(pos => {
      // 创建建筑物主体
      const buildingGeometry = new THREE.BoxGeometry(pos.width, pos.height, pos.depth)
      const buildingMaterial = new THREE.MeshStandardMaterial({
        color: pos.color,
        roughness: 0.7,
        metalness: 0.2
      })
      const building = new THREE.Mesh(buildingGeometry, buildingMaterial)
      building.position.set(pos.x, pos.height / 2, pos.z)
      building.castShadow = true
      building.receiveShadow = true
      this.scene.add(building)

      // 为每个建筑物添加窗户
      const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        roughness: 0.3,
        metalness: 0.8,
        emissive: 0xFFFFFF,
        emissiveIntensity: 0.2
      })

      // 在建筑物正面添加窗户
      const windowGeometry = new THREE.PlaneGeometry(1, 1.5)
      const windowPositions = [
        { x: -2, y: 5, z: pos.depth/2 + 0.1 },
        { x: 2, y: 5, z: pos.depth/2 + 0.1 },
        { x: -2, y: 10, z: pos.depth/2 + 0.1 },
        { x: 2, y: 10, z: pos.depth/2 + 0.1 },
        { x: -2, y: 15, z: pos.depth/2 + 0.1 },
        { x: 2, y: 15, z: pos.depth/2 + 0.1 }
      ]

      windowPositions.forEach(windowPos => {
        const window = new THREE.Mesh(windowGeometry, windowMaterial)
        window.position.set(
          pos.x + windowPos.x,
          windowPos.y,
          pos.z + windowPos.z
        )
        this.scene.add(window)
      })

      // 添加屋顶装饰
      const roofGeometry = new THREE.BoxGeometry(pos.width + 1, 1, pos.depth + 1)
      const roofMaterial = new THREE.MeshStandardMaterial({
        color: 0x424242,
        roughness: 0.8,
        metalness: 0.2
      })
      const roof = new THREE.Mesh(roofGeometry, roofMaterial)
      roof.position.set(pos.x, pos.height + 0.5, pos.z)
      roof.castShadow = true
      this.scene.add(roof)
    })

    // 添加树木
    this.createTrees()
  }

  createTrees() {
    const treePositions = [
      { x: -35, z: -35 },
      { x: 35, z: -35 },
      { x: -35, z: 35 },
      { x: 35, z: 35 },
      { x: -25, z: 0 },
      { x: 25, z: 0 }
    ]

    treePositions.forEach(pos => {
      // 树干
      const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 4, 8)
      const trunkMaterial = new THREE.MeshStandardMaterial({
        color: 0x8D6E63,
        roughness: 0.9,
        metalness: 0.1
      })
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial)
      trunk.position.set(pos.x, 2, pos.z)
      trunk.castShadow = true
      this.scene.add(trunk)

      // 树冠
      const leavesGeometry = new THREE.ConeGeometry(3, 6, 8)
      const leavesMaterial = new THREE.MeshStandardMaterial({
        color: 0x81C784,
        roughness: 0.8,
        metalness: 0.1
      })
      const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial)
      leaves.position.set(pos.x, 7, pos.z)
      leaves.castShadow = true
      this.scene.add(leaves)
    })
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
      
      // 使用更平滑的插值
      const lerpFactor = 0.05 // 降低插值因子，使过渡更平滑
      this.orbit.theta += (this.orbit.targetTheta - this.orbit.theta) * lerpFactor
      this.orbit.phi += (this.orbit.targetPhi - this.orbit.phi) * lerpFactor
      
      // 限制垂直视角范围
      this.orbit.phi = Math.max(-80 * Math.PI / 180, Math.min(-60 * Math.PI / 180, this.orbit.phi))
      
      // 计算摄像机位置
      const x = position.x + this.orbit.radius * Math.sin(this.orbit.phi) * Math.sin(this.orbit.theta)
      const y = position.y + this.orbit.radius * Math.cos(this.orbit.phi)
      const z = position.z + this.orbit.radius * Math.sin(this.orbit.phi) * Math.cos(this.orbit.theta)
      
      // 使用更平滑的摄像机移动
      const cameraLerpFactor = 0.1 // 降低摄像机移动的插值因子
      this.camera.position.lerp(new THREE.Vector3(x, y, z), cameraLerpFactor)
      
      // 使用更平滑的摄像机注视点
      const targetPosition = position.clone()
      targetPosition.y += 1 // 稍微抬高注视点，使视角更自然
      this.camera.lookAt(targetPosition)
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
        this.simpleCar.setWheelRotation(-wheelRotationSpeed / 2);
      } else {
        this.simpleCar.setWheelRotation(0);
      }
    }
  }
  
  update() {
    const delta = this.clock.getDelta()
    
    // 处理输入
    this.handleInput()
    
    // 更新车辆
    if (this.simpleCar) {
      this.simpleCar.update(delta)
    }
    
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