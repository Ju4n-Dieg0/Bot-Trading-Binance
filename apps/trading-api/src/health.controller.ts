import { Controller, Get } from "@nestjs/common";
import { AppConfigService } from "./config/app-config.service";

@Controller("health")
export class HealthController {
  constructor(private readonly config: AppConfigService) {}

  @Get()
  check(): { status: string; mode: string } {
    return { status: "ok", mode: this.config.env.TRADING_MODE };
  }
}
