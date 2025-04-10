// src/renderer/utils/CustomStats.ts
type Bucket = {
    minVal: number;
    avgVal: number;
    maxVal: number;
    count: number;
};

interface StatsOptions {
    width?: number;
    height?: number;
    bucketCount?: number;
    zeroLine?: boolean;
    showStats?: boolean;
    showBounds?: boolean;
    globalMinVal?: number;  // New
    globalMaxVal?: number;  // New
}

type ChartData = {
    buckets: Bucket[],
    index: number,
    bucketCount: number,
    maxValue: number,
    minValue: number,
    options: StatsOptions,
    canvas: HTMLCanvasElement,
}


/**
 * This is an attempt to use the stats.js idea to produce a general telemetry logger.
 */
class CustomStats {
    private container: HTMLDivElement;
    // private charts: Map<string, {
    //     canvas: HTMLCanvasElement,
    //     buckets: Bucket[],
    //     maxValue: number,
    //     minValue: number,
    //     index: number,
    //     bucketCount: number,
    //     options: StatsOptions
    // }>;

    private charts: Map<string, ChartData>;
    private globalOptions: StatsOptions;

    constructor(options: StatsOptions = {}) {
        this.globalOptions = {
            width: 400,
            height: 150,
            bucketCount: 60,
            zeroLine: true,
            showStats: true,
            showBounds: true, ...options,
        };
        this.container = document.createElement('div');
        this.container.style.cssText = 'position:fixed;top:0;left:0;z-index:10000;opacity:0.8;';
        document.body.appendChild(this.container);
        this.charts = new Map();
    }

    private createChart(name: string): HTMLCanvasElement {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:relative;margin:2px;border:1px solid #444;display:block;background:#111;';

        const canvas = document.createElement('canvas');
        canvas.width = this.globalOptions.width!;
        canvas.height = this.globalOptions.height!;
        wrapper.appendChild(canvas);

        const minimizeBtn = document.createElement('button');
        minimizeBtn.innerText = '-';
        minimizeBtn.style.cssText = 'position:absolute;top:0;right:0;color:white;background:#333;border:none;padding:2px;cursor:pointer;';
        wrapper.appendChild(minimizeBtn);

        minimizeBtn.addEventListener('click', () => {
            if (canvas.style.display === 'none') {
                canvas.style.display = 'block';
                minimizeBtn.innerText = '-';
            } else {
                canvas.style.display = 'none';
                minimizeBtn.innerText = '+';
            }
        });

        this.container.appendChild(wrapper);
        return canvas;
    }

    addSeries(name: string, options: StatsOptions = {}) {
        if (this.charts.has(name)) return;

        const canvas = this.createChart(name);
        const chartOptions = { ...this.globalOptions, ...options };
        const buckets: Bucket[] = Array.from({ length: chartOptions.bucketCount! }, () => ({
            minVal: Infinity,
            avgVal: 0,
            maxVal: -Infinity,
            count: 0,
        }));

        this.charts.set(name, {
            options: chartOptions,
            buckets,
            maxValue: chartOptions.globalMaxVal ?? 1,
            minValue: chartOptions.globalMinVal ?? -1,
            index: 0,
            bucketCount: chartOptions.bucketCount!,
            canvas: canvas,
        });
    }

    addValue(name: string, value: number, options?: Partial<StatsOptions>) {
        const timestamp = Date.now();

        if (!this.charts.has(name)) {
            this.addSeries(name);

        }

        const chart = this.charts.get(name);
        if (!chart) return;

        if (options) {
            chart.options = { ...chart.options, ...options };
        }


        const currentBucketIndex = Math.floor(timestamp / 1000) % chart.bucketCount;

        if (chart.index !== currentBucketIndex) {
            // Before moving to a new bucket, recalculate global min/max for the entire window
            this.recalculateGlobalMinMax(chart);

            // Move to the new bucket
            chart.index = currentBucketIndex;
            chart.buckets[chart.index] = { minVal: value, avgVal: value, maxVal: value, count: 1 };
        } else {
            const bucket = chart.buckets[chart.index];
            bucket.minVal = Math.min(bucket.minVal, value);
            bucket.maxVal = Math.max(bucket.maxVal, value);
            bucket.avgVal = (bucket.avgVal * bucket.count + value) / (bucket.count + 1);
            bucket.count++;
        }

        // console.log(`plotting chart: ${name} value: ${value} bucket: ${chart.index} min: ${chart.minValue} max: ${chart.maxValue}`);

        this.drawChart(name, chart);
    }

    /**
     * Recalculates the global min and max by iterating over all buckets.
     * Called only when a new bucket is created.
     */
    private recalculateGlobalMinMax(chart: ChartData) {
        let globalMin = Infinity;
        let globalMax = -Infinity;

        for (let i = 0; i < chart.bucketCount; i++) {
            const bucket = chart.buckets[i];
            if (bucket.count > 0) {  // Only consider buckets with data
                globalMin = Math.min(globalMin, bucket.minVal);
                globalMax = Math.max(globalMax, bucket.maxVal);
            }
        }

        chart.maxValue = chart.options.globalMaxVal !== undefined ? Math.max(globalMax, chart.options.globalMaxVal) : globalMax;
        chart.minValue = chart.options.globalMinVal !== undefined ? Math.min(globalMin, chart.options.globalMinVal) : globalMin;

        // Force range to be symmetrical
        const absoluteMax = Math.max(Math.abs(chart.maxValue), Math.abs(chart.minValue));
        chart.maxValue = absoluteMax;
        chart.minValue = -absoluteMax;
    }

    setGlobalOption<K extends keyof StatsOptions>(optionName: K, value: StatsOptions[K]) {
      this.globalOptions[optionName] = value;

      this.charts.forEach((chart: ChartData) => {
        chart.options[optionName] = value;
      });
    }

    setChartOption<K extends keyof StatsOptions>(seriesName: string, optionName: K, value: StatsOptions[K]) {
        const chart = this.charts.get(seriesName);
        if (chart) {
            chart.options[optionName] = value;
        }
    }

    private drawChart(name: string, chart: ChartData) {
        const ctx = chart.canvas.getContext('2d');
        if (!ctx) return;

        const { canvas, buckets, maxValue, minValue, index, bucketCount, options } = chart;

        // Calculate symmetrical range
        const absoluteMax = Math.max(Math.abs(maxValue), Math.abs(minValue));
        const range = absoluteMax * 2;  // This ensures the graph scales from -absoluteMax to +absoluteMax

        const midY = canvas.height / 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Get the current bucket for display
        const currentBucket = buckets[index];
        const statsText = options.showStats && currentBucket.count > 0 ?
            `(${currentBucket.minVal.toFixed(2)} / ${currentBucket.avgVal.toFixed(2)} / ${currentBucket.maxVal.toFixed(2)})` : '';

        // Styling
        ctx.fillStyle = '#002';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const boundsText = options.showBounds ?
            ` [${chart.minValue.toFixed(2)}, ${chart.maxValue.toFixed(2)}]` : '';

        const bucketWidth = canvas.width / bucketCount;


        if (chart.options.zeroLine) {
            ctx.strokeStyle = '#888';
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(0, midY);
            ctx.lineTo(canvas.width, midY);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw min area to the zero line (bottom part)
        ctx.beginPath();
        ctx.moveTo(0, midY);
        for (let i = 0; i < bucketCount; i++) {
            const bucket = buckets[(index + 1 + i) % bucketCount];
            const x = i * bucketWidth;
            const y = midY - (bucket.minVal / absoluteMax) * (canvas.height / 2);
            ctx.lineTo(x, y);
        }
        ctx.lineTo(canvas.width, midY);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.fill();

        // Draw max area to the zero line (top part)
        ctx.beginPath();
        ctx.moveTo(0, midY);
        for (let i = 0; i < bucketCount; i++) {
            const bucket = buckets[(index + 1 + i) % bucketCount];
            const x = i * bucketWidth;
            const y = midY - (bucket.maxVal / absoluteMax) * (canvas.height / 2);
            ctx.lineTo(x, y);
        }
        ctx.lineTo(canvas.width, midY);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 255, 255, 0.6)';
        ctx.fill();

        // Draw avg line
        ctx.beginPath();
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 1;
        for (let i = 0; i < bucketCount; i++) {
            const bucket = buckets[(index + 1 + i) % bucketCount];
            const x = i * bucketWidth;
            const y = midY - (bucket.avgVal / absoluteMax) * (canvas.height / 2);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Draw title at top-left
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.fillText(`${name}`, 5, 15);

        // Draw stats/bounds text at bottom-left
        ctx.fillStyle = '#fff';
        ctx.font = '9px Arial';
        ctx.fillText(`${statsText}${boundsText}`, 5, canvas.height - 5);
    }
}


export const statsManager = new CustomStats({
    width: 200,
    height: 80,
    bucketCount: 30,
    zeroLine: true,
    showStats: true,
    showBounds: true,
});


// statsManager.addSeries('velocity.x');
// statsManager.addSeries('velocity.y');
// statsManager.addSeries('velocity.z');
//
// setInterval(() => {
//     const vel = { value: { x: Math.random() * 10 - 5, y: Math.random() * 10 - 5, z: Math.random() * 10 - 5 } };
//     statsManager.addValue('velocity.x', vel.value.x);
//     statsManager.addValue('velocity.y', vel.value.y);
//     statsManager.addValue('velocity.z', vel.value.z);
// }, 500);
