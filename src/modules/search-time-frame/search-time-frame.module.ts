import { Module } from "@nestjs/common";
import { SearchTimeFrameService } from "src/modules/search-time-frame/services";

@Module({
  imports: [],
  providers: [SearchTimeFrameService],
  exports: [SearchTimeFrameService],
})
export class SearchTimeFrameModule {}
