/* eslint-disable @typescript-eslint/no-magic-numbers */
import { Injectable } from "@nestjs/common";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { Counter, Gauge, Histogram, Summary } from "prom-client";

@Injectable()
export class PrometheusService {
  constructor(
    @InjectMetric("node_ws_connected_clients") public connectedClientsGauge: Gauge<string>,
    @InjectMetric("node_ws_messages_sent_total") public messagesSentCounter: Counter<string>,
    @InjectMetric("node_ws_connection_duration_le_5") private le5Counter: Counter<string>,
    @InjectMetric("node_ws_connection_duration_le_15") private le15Counter: Counter<string>,
    @InjectMetric("node_ws_connection_duration_le_30") private le30Counter: Counter<string>,
    @InjectMetric("node_ws_connection_duration_le_60") private le60Counter: Counter<string>,
    @InjectMetric("node_ws_connection_duration_le_120") private le120Counter: Counter<string>,
    @InjectMetric("node_ws_connection_duration_le_300") private le300Counter: Counter<string>,
    @InjectMetric("node_ws_connection_duration_le_600") private le600Counter: Counter<string>,
    @InjectMetric("node_ws_connection_duration_le_900") private le900Counter: Counter<string>,
    @InjectMetric("node_ws_connection_duration_le_1800") private le1800Counter: Counter<string>,
    @InjectMetric("node_ws_connection_duration_gt_1800") private gt1800Counter: Counter<string>,
    @InjectMetric("http_request_duration_seconds")
    private readonly httpRequestDurationHistogram: Histogram<string>,
    @InjectMetric("http_request_summary_seconds")
    private readonly httpRequestDurationSummary: Summary<string>,
  ) {}

  public recordHttpRequestDuration(method: string, route: string, statusCode: number, durationInSeconds: number): void {
    this.httpRequestDurationHistogram.labels(method, route, statusCode.toString()).observe(durationInSeconds);

    this.httpRequestDurationSummary.labels(method, route, statusCode.toString()).observe(durationInSeconds);
  }

  public incrementCounter(duration: number): void {
    switch (true) {
      case duration <= 5:
        this.le5Counter.inc();
        break;
      case duration <= 15:
        this.le15Counter.inc();
        break;
      case duration <= 30:
        this.le30Counter.inc();
        break;
      case duration <= 60:
        this.le60Counter.inc();
        break;
      case duration <= 120:
        this.le120Counter.inc();
        break;
      case duration <= 300:
        this.le300Counter.inc();
        break;
      case duration <= 600:
        this.le600Counter.inc();
        break;
      case duration <= 900:
        this.le900Counter.inc();
        break;
      case duration <= 1800:
        this.le1800Counter.inc();
        break;
      default:
        this.gt1800Counter.inc();
        break;
    }
  }
}
