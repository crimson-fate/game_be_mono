import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { walletAddressDto } from './dto/WalletAddress.dto';
import { Model } from 'mongoose';
import { Seasons } from '@app/shared/models/schema/season.schema';
import { SeasonStats } from '@app/shared/models/schema/season-stats.schema';
import { PlayerProgress } from '@app/shared/models/schema/player-progress.schema';
import { formattedContractAddress } from '@app/shared/utils/formatAddress';
import { CompleteWaveDto } from './dto/CompleteWave.dto';
import { SeasonIdDto } from './dto/SeasonId.dto';

@Injectable()
export class DungeonService {
  constructor(
    @InjectModel(Seasons.name)
    private readonly seasonModel: Model<Seasons>,
    @InjectModel(SeasonStats.name)
    private readonly seasonStatsModel: Model<SeasonStats>,
    @InjectModel(PlayerProgress.name)
    private readonly playerProgressModel: Model<PlayerProgress>,
  ) {}

  async getCurrentSeason() {
    const now = Date.now();
    const currentSeason = await this.seasonModel.findOne({
      startDate: { $lte: now },
      endDate: { $gt: now },
    });

    return currentSeason;
  }

  async startNewGame(query: walletAddressDto) {
    const { walletAddress } = query;

    const formattedAddress = formattedContractAddress(walletAddress);
    const now = Date.now();
    const currentSeason = await this.seasonModel.findOne({
      startDate: { $lte: now },
      endDate: { $gt: now },
    });

    const newProgress = new this.playerProgressModel({
      player: formattedAddress,
      wave: 1,
      season: currentSeason,
      startTime: now,
      endTime: 0,
      isCompleted: false,
    });

    return newProgress.save();
  }

  async completeWave(query: CompleteWaveDto) {
    const { walletAddress, progressId } = query;

    const formattedAddress = formattedContractAddress(walletAddress);
    const now = Date.now();
    const currentSeason = await this.seasonModel.findOne({
      startDate: { $lte: now },
      endDate: { $gt: now },
    });

    const playerProgress = await this.playerProgressModel.findOne({
      _id: progressId,
      player: formattedAddress,
      season: currentSeason,
    });

    if (!playerProgress) {
      throw new HttpException(
        'Player progress not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (playerProgress.endTime > 0) {
      throw new HttpException(
        'Player progress already ended',
        HttpStatus.BAD_REQUEST,
      );
    }

    playerProgress.isCompleted = true;
    playerProgress.endTime = now;
    await playerProgress.save();

    await this.seasonStatsModel.findOneAndUpdate(
      { seasonId: currentSeason._id, player: formattedAddress },
      {
        $inc: {
          totalWave: 1,
        },
      },
      { new: true, upsert: true },
    );

    const newProgress = new this.playerProgressModel({
      player: formattedAddress,
      wave: playerProgress.wave + 1,
      season: currentSeason,
      startTime: now,
      endTime: 0,
      isCompleted: false,
    });
    return await newProgress.save();
  }

  async endWave(query: CompleteWaveDto) {
    const { walletAddress, progressId } = query;

    const formattedAddress = formattedContractAddress(walletAddress);
    const now = Date.now();
    const currentSeason = await this.seasonModel.findOne({
      startDate: { $lte: now },
      endDate: { $gt: now },
    });

    const playerProgress = await this.playerProgressModel.findOne({
      _id: progressId,
      player: formattedAddress,
      season: currentSeason,
    });

    if (!playerProgress) {
      throw new HttpException(
        'Player progress not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (playerProgress.endTime > 0) {
      throw new HttpException(
        'Player progress already ended',
        HttpStatus.BAD_REQUEST,
      );
    }

    playerProgress.endTime = now;
    return await playerProgress.save();
  }

  async getLeaderboard(query: SeasonIdDto) {
    const { seasonId } = query;

    const seasonDocument = await this.seasonModel.findOne({ _id: seasonId });
    if (!seasonDocument) {
      throw new HttpException('Season not found', HttpStatus.NOT_FOUND);
    }

    const leaderboard = await this.seasonStatsModel.find(
      {
        seasonId: seasonId,
      },
      {},
      { sort: { totalWave: -1 }, limit: 10 },
    );

    return leaderboard;
  }
}
