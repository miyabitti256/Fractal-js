import type { FractalType, MandelbrotParameters } from '@/types/fractal';

export interface WebGPUCapabilities {
  isSupported: boolean;
  device?: GPUDevice;
  adapter?: GPUAdapter;
  features: string[];
  limits: Record<string, number>;
}

// WebGPU型定義の拡張（基本的な型のみ）
declare global {
  interface Navigator {
    gpu?: {
      requestAdapter(options?: {
        powerPreference?: 'low-power' | 'high-performance';
      }): Promise<GPUAdapter | null>;
    };
  }

  interface GPUAdapter {
    requestDevice(descriptor?: {
      requiredFeatures?: string[];
      requiredLimits?: Record<string, number>;
    }): Promise<GPUDevice>;
    features: Set<string>;
    limits: Record<string, number>;
    info?: {
      vendor?: string;
      device?: string;
    };
  }

  interface GPUDevice {
    createShaderModule(descriptor: { code: string; label?: string }): GPUShaderModule;
    createBindGroupLayout(descriptor: {
      label?: string;
      entries: Array<{
        binding: number;
        visibility: number;
        buffer?: { type: string };
      }>;
    }): GPUBindGroupLayout;
    createPipelineLayout(descriptor: {
      label?: string;
      bindGroupLayouts: GPUBindGroupLayout[];
    }): GPUPipelineLayout;
    createComputePipeline(descriptor: {
      label?: string;
      layout: GPUPipelineLayout;
      compute: {
        module: GPUShaderModule;
        entryPoint: string;
      };
    }): GPUComputePipeline;
    createBuffer(descriptor: { label?: string; size: number; usage: number }): GPUBuffer;
    createBindGroup(descriptor: {
      label?: string;
      layout: GPUBindGroupLayout;
      entries: Array<{
        binding: number;
        resource: { buffer: GPUBuffer };
      }>;
    }): GPUBindGroup;
    createCommandEncoder(descriptor?: { label?: string }): GPUCommandEncoder;
    queue: GPUQueue;
    destroy(): void;
    label?: string;
  }

  interface GPUShaderModule {}
  interface GPUBindGroupLayout {}
  interface GPUPipelineLayout {}
  interface GPUComputePipeline {}
  interface GPUBindGroup {}

  interface GPUBuffer {
    destroy(): void;
    mapAsync(mode: number): Promise<void>;
    getMappedRange(): ArrayBuffer;
    unmap(): void;
  }

  interface GPUQueue {
    writeBuffer(buffer: GPUBuffer, bufferOffset: number, data: ArrayBuffer): void;
    submit(commandBuffers: GPUCommandBuffer[]): void;
  }

  interface GPUCommandEncoder {
    beginComputePass(descriptor?: { label?: string }): GPUComputePassEncoder;
    copyBufferToBuffer(
      source: GPUBuffer,
      sourceOffset: number,
      destination: GPUBuffer,
      destinationOffset: number,
      size: number
    ): void;
    finish(): GPUCommandBuffer;
  }

  interface GPUComputePassEncoder {
    setPipeline(pipeline: GPUComputePipeline): void;
    setBindGroup(index: number, bindGroup: GPUBindGroup): void;
    dispatchWorkgroups(
      workgroupCountX: number,
      workgroupCountY?: number,
      workgroupCountZ?: number
    ): void;
    end(): void;
  }

  interface GPUCommandBuffer {}

  // 定数
  const GPUShaderStage: {
    COMPUTE: number;
  };

  const GPUBufferUsage: {
    UNIFORM: number;
    STORAGE: number;
    COPY_SRC: number;
    COPY_DST: number;
    MAP_READ: number;
  };

  const GPUMapMode: {
    READ: number;
  };
}

export class WebGPUEngine {
  private device: GPUDevice | null = null;
  private adapter: GPUAdapter | null = null;
  private pipeline: GPUComputePipeline | null = null;
  private bindGroupLayout: GPUBindGroupLayout | null = null;
  private isInitialized = false;

  /**
   * WebGPUサポート状況をチェック
   */
  static async checkSupport(): Promise<WebGPUCapabilities> {
    if (!('gpu' in navigator)) {
      return {
        isSupported: false,
        features: [],
        limits: {},
      };
    }

    try {
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance',
      });

      if (!adapter) {
        return {
          isSupported: false,
          features: [],
          limits: {},
        };
      }

      const device = await adapter.requestDevice();

      return {
        isSupported: true,
        adapter,
        device,
        features: Array.from(adapter.features),
        limits: Object.fromEntries(
          Object.entries(adapter.limits).map(([key, value]) => [key, Number(value)])
        ),
      };
    } catch (error) {
      console.warn('WebGPU not supported:', error);
      return {
        isSupported: false,
        features: [],
        limits: {},
      };
    }
  }

  /**
   * WebGPUエンジンを初期化
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔧 WebGPU詳細初期化開始');

      if (!('gpu' in navigator)) {
        throw new Error('WebGPU not supported - navigator.gpu が存在しません');
      }
      console.log('✅ navigator.gpu が利用可能');

      console.log('🔍 WebGPUアダプター要求中...');
      this.adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance',
      });

      if (!this.adapter) {
        throw new Error('No WebGPU adapter found');
      }

      console.log('✅ WebGPUアダプター取得成功');
      console.log('📊 アダプター情報:');
      console.log(`  - 利用可能機能: ${Array.from(this.adapter.features).join(', ') || 'なし'}`);
      console.log(`  - ベンダー: ${this.adapter.info?.vendor || '不明'}`);
      console.log(`  - デバイス: ${this.adapter.info?.device || '不明'}`);

      console.log('🔧 WebGPUデバイス要求中...');
      this.device = await this.adapter.requestDevice({
        requiredFeatures: [],
        requiredLimits: {},
      });
      console.log('✅ WebGPUデバイス取得成功');

      console.log('🛠️ コンピュートパイプライン作成中...');
      await this.createComputePipeline();
      console.log('✅ コンピュートパイプライン作成成功');

      this.isInitialized = true;

      console.log('🎯 WebGPU初期化完全成功!');
      return true;
    } catch (error) {
      console.error('❌ WebGPU初期化失敗:', error);
      return false;
    }
  }

  /**
   * コンピュートシェーダーパイプラインを作成
   */
  private async createComputePipeline(): Promise<void> {
    if (!this.device) throw new Error('Device not initialized');

    const shaderCode = `
      struct Parameters {
        width: u32,
        height: u32,
        centerX: f32,
        centerY: f32,
        zoom: f32,
        maxIterations: u32,
        escapeRadius: f32,
        _padding: f32,
      }

      @group(0) @binding(0) var<uniform> params: Parameters;
      @group(0) @binding(1) var<storage, read_write> output: array<u32>;

      @compute @workgroup_size(8, 8)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let x = global_id.x;
        let y = global_id.y;
        
        if (x >= params.width || y >= params.height) {
          return;
        }

        let aspectRatio = f32(params.width) / f32(params.height);
        let scale = 3.0 / params.zoom;
        
        let real = params.centerX + ((f32(x) - f32(params.width) / 2.0) * scale * aspectRatio) / f32(params.width);
        let imag = params.centerY + ((f32(y) - f32(params.height) / 2.0) * scale) / f32(params.height);
        
        var zx = 0.0;
        var zy = 0.0;
        var iteration = 0u;
        
        while (zx * zx + zy * zy <= params.escapeRadius && iteration < params.maxIterations) {
          let temp = zx * zx - zy * zy + real;
          zy = 2.0 * zx * zy + imag;
          zx = temp;
          iteration = iteration + 1u;
        }
        
        let index = y * params.width + x;
        output[index] = iteration;
      }
    `;

    const shaderModule = this.device.createShaderModule({
      label: 'Mandelbrot Compute Shader',
      code: shaderCode,
    });

    this.bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Mandelbrot Bind Group Layout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'uniform' },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' },
        },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      label: 'Mandelbrot Pipeline Layout',
      bindGroupLayouts: [this.bindGroupLayout],
    });

    this.pipeline = this.device.createComputePipeline({
      label: 'Mandelbrot Compute Pipeline',
      layout: pipelineLayout,
      compute: {
        module: shaderModule,
        entryPoint: 'main',
      },
    });
  }

  /**
   * Mandelbrot集合をレンダリング
   */
  async renderMandelbrot(
    parameters: MandelbrotParameters,
    width: number,
    height: number
  ): Promise<number[][]> {
    if (!this.isInitialized || !this.device || !this.pipeline || !this.bindGroupLayout) {
      throw new Error('WebGPU engine not initialized');
    }

    const outputSize = width * height * 4; // u32 = 4 bytes

    // パラメータバッファを作成
    const paramsBuffer = this.device.createBuffer({
      label: 'Parameters Buffer',
      size: 32, // Parameters struct size (aligned to 16 bytes)
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // 出力バッファを作成
    const outputBuffer = this.device.createBuffer({
      label: 'Output Buffer',
      size: outputSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    // 読み取り用バッファを作成
    const readBuffer = this.device.createBuffer({
      label: 'Read Buffer',
      size: outputSize,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    // パラメータデータを準備
    const paramsData = new ArrayBuffer(32);
    const paramsView = new DataView(paramsData);
    paramsView.setUint32(0, width, true);
    paramsView.setUint32(4, height, true);
    paramsView.setFloat32(8, parameters.centerX, true);
    paramsView.setFloat32(12, parameters.centerY, true);
    paramsView.setFloat32(16, parameters.zoom, true);
    paramsView.setUint32(20, parameters.iterations, true);
    paramsView.setFloat32(24, parameters.escapeRadius, true);
    paramsView.setFloat32(28, 0, true); // padding

    // バッファにデータを書き込み
    this.device.queue.writeBuffer(paramsBuffer, 0, paramsData);

    // バインドグループを作成
    const bindGroup = this.device.createBindGroup({
      label: 'Mandelbrot Bind Group',
      layout: this.bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: paramsBuffer },
        },
        {
          binding: 1,
          resource: { buffer: outputBuffer },
        },
      ],
    });

    // コマンドエンコーダーを作成
    const commandEncoder = this.device.createCommandEncoder({
      label: 'Mandelbrot Command Encoder',
    });

    // コンピュートパスを開始
    const computePass = commandEncoder.beginComputePass({
      label: 'Mandelbrot Compute Pass',
    });

    computePass.setPipeline(this.pipeline);
    computePass.setBindGroup(0, bindGroup);

    const workgroupsX = Math.ceil(width / 8);
    const workgroupsY = Math.ceil(height / 8);
    computePass.dispatchWorkgroups(workgroupsX, workgroupsY);
    computePass.end();

    // 結果を読み取りバッファにコピー
    commandEncoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, outputSize);

    // コマンドを送信
    this.device.queue.submit([commandEncoder.finish()]);

    // 結果を読み取り
    await readBuffer.mapAsync(GPUMapMode.READ);
    const arrayBuffer = readBuffer.getMappedRange();
    const results = new Uint32Array(arrayBuffer.slice(0));
    readBuffer.unmap();

    // 2D配列に変換
    const iterationData: number[][] = [];
    for (let y = 0; y < height; y++) {
      const row: number[] = [];
      for (let x = 0; x < width; x++) {
        const value = results[y * width + x];
        row.push(value !== undefined ? value : 0);
      }
      iterationData.push(row);
    }

    // リソースをクリーンアップ
    paramsBuffer.destroy();
    outputBuffer.destroy();
    readBuffer.destroy();

    return iterationData;
  }

  /**
   * エンジンを破棄
   */
  dispose(): void {
    if (this.device) {
      this.device.destroy();
      this.device = null;
    }
    this.adapter = null;
    this.pipeline = null;
    this.bindGroupLayout = null;
    this.isInitialized = false;
  }

  /**
   * 初期化状態を取得
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * デバイス情報を取得
   */
  getDeviceInfo(): { adapter: string; device: string } | null {
    if (!this.adapter || !this.device) return null;

    return {
      adapter: `WebGPU Adapter: ${this.adapter.info?.vendor || 'Unknown'} ${this.adapter.info?.device || ''}`,
      device: `Device: ${this.device.label || 'WebGPU Device'}`,
    };
  }
}
