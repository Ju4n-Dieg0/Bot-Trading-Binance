import { Injectable } from "@nestjs/common";
import { type AppEnv, getEnv } from "@libs/config";

@Injectable()
export class AppConfigService {
  public readonly env: AppEnv;

  constructor() {
    this.env = getEnv();
  }
}
