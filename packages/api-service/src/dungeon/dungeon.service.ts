import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { walletAddressDto } from './dto/WalletAddress.dto';
import { Model, Types } from 'mongoose';
import { Seasons } from '@app/shared/models/schema/season.schema';
import { Players } from '@app/shared/models/schema/player.schema';
import { PlayerProgress } from '@app/shared/models/schema/player-progress.schema';
import { CompleteWaveDto } from './dto/CompleteWave.dto';
import { GetCurrentRankDto, SeasonIdDto } from './dto/SeasonId.dto';
import { v1 as uuidv1 } from 'uuid';
import { PlayersService } from '../players/players.service';
import { PlayerProgressDto } from './dto/PlayerProgress.dto';

@Injectable()
export class DungeonService {
  constructor(
    @InjectModel(Seasons.name)
    private readonly seasonModel: Model<Seasons>,
    @InjectModel(Players.name)
    private readonly PlayersModel: Model<Players>,
    @InjectModel(PlayerProgress.name)
    private readonly playerProgressModel: Model<PlayerProgress>,
    private readonly playerService: PlayersService,
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

    const now = Date.now();
    const currentSeason = await this.seasonModel.findOne({
      startDate: { $lte: now },
      endDate: { $gt: now },
    });

    const player = await this.playerService.getOrCreeatePlayer(walletAddress);
    await this.playerProgressModel.updateMany(
      {
        player: player._id,
        season: currentSeason._id,
        endTime: 0,
      },
      { $set: { endTime: now } },
    );

    const newProgress = new this.playerProgressModel({
      player: player,
      wave: 1,
      gameId: uuidv1(),
      season: currentSeason,
      startTime: now,
      endTime: 0,
      isCompleted: false,
    });

    const progress = await (
      await newProgress.save()
    ).populate(['player', 'season']);
    const result: PlayerProgressDto = {
      player: {
        address: progress.player.address,
        username: progress.player.username,
      },
      gameId: progress.gameId.toString(),
      wave: progress.wave,
      season: {
        id: progress.season._id,
        name: progress.season.name,
        startDate: progress.season.startDate,
        endDate: progress.season.endDate,
      },
      startTime: progress.startTime,
      endTime: progress.endTime,
      isCompleted: progress.isCompleted,
    };
    return result;
  }

  async getCurrentGame(query: walletAddressDto) {
    const { walletAddress } = query;

    const player = await this.playerService.getOrCreeatePlayer(walletAddress);

    const now = Date.now();
    const currentSeason = await this.seasonModel.findOne({
      startDate: { $lte: now },
      endDate: { $gt: now },
    });

    const playerProgress = await this.playerProgressModel
      .findOne(
        {
          player: player._id,
          season: currentSeason._id,
          endTime: 0,
        },
        {},
        { sort: { wave: -1 } },
      )
      .populate(['player', 'season']);

    console.log(playerProgress);

    if (!playerProgress) {
      return null;
    }

    const result: PlayerProgressDto = {
      player: {
        address: playerProgress.player.address,
        username: playerProgress.player.username,
      },
      gameId: playerProgress.gameId.toString(),
      wave: playerProgress.wave,
      season: {
        id: playerProgress.season._id,
        name: playerProgress.season.name,
        startDate: playerProgress.season.startDate,
        endDate: playerProgress.season.endDate,
      },
      startTime: playerProgress.startTime,
      endTime: playerProgress.endTime,
      isCompleted: playerProgress.isCompleted,
    };
    return result;
  }

  async completeWave(query: CompleteWaveDto) {
    const { walletAddress, gameId } = query;

    const player = await this.playerService.getOrCreeatePlayer(walletAddress);

    const now = Date.now();
    const currentSeason = await this.seasonModel.findOne({
      startDate: { $lte: now },
      endDate: { $gt: now },
    });

    const playerProgress = await this.playerProgressModel.findOne(
      {
        gameId,
        player: player._id,
        season: currentSeason._id,
      },
      {},
      { sort: { wave: -1 } },
    );

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

    const newProgress = new this.playerProgressModel({
      player: player,
      wave: playerProgress.wave + 1,
      gameId,
      season: currentSeason,
      startTime: now,
      endTime: 0,
      isCompleted: false,
    });
    const progress = await newProgress.save();
    const result: PlayerProgressDto = {
      player: {
        address: progress.player.address,
        username: progress.player.username,
      },
      gameId: progress.gameId.toString(),
      wave: progress.wave,
      season: {
        id: progress.season._id,
        name: progress.season.name,
        startDate: progress.season.startDate,
        endDate: progress.season.endDate,
      },
      startTime: progress.startTime,
      endTime: progress.endTime,
      isCompleted: progress.isCompleted,
    };
    return result;
  }

  async endWave(query: CompleteWaveDto) {
    const { walletAddress, gameId } = query;

    const player = await this.playerService.getOrCreeatePlayer(walletAddress);
    const now = Date.now();
    const currentSeason = await this.seasonModel.findOne({
      startDate: { $lte: now },
      endDate: { $gt: now },
    });

    const playerProgress = await this.playerProgressModel.findOne(
      {
        gameId,
        player: player._id,
        season: currentSeason._id,
      },
      {},
      { sort: { wave: -1 } },
    );

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
    const progress = await (
      await playerProgress.save()
    ).populate(['player', 'season']);
    const result: PlayerProgressDto = {
      player: {
        address: progress.player.address,
        username: progress.player.username,
      },
      gameId: progress.gameId.toString(),
      wave: progress.wave,
      season: {
        id: progress.season._id,
        name: progress.season.name,
        startDate: progress.season.startDate,
        endDate: progress.season.endDate,
      },
      startTime: progress.startTime,
      endTime: progress.endTime,
      isCompleted: progress.isCompleted,
    };
    return result;
  }

  async getLeaderboard(query: SeasonIdDto) {
    const { seasonId } = query;

    const seasonDocument = await this.seasonModel.findOne({ _id: seasonId });
    if (!seasonDocument) {
      throw new HttpException('Season not found', HttpStatus.NOT_FOUND);
    }

    const leaderboard = await this.playerProgressModel.aggregate([
      {
        $match: {
          season: seasonDocument._id,
          isCompleted: true,
        },
      },
      {
        $group: {
          _id: {
            player: '$player',
            gameId: '$gameId',
          },
          totalWave: { $sum: 1 },
          startTime: { $first: '$startTime' },
          endTime: { $last: '$endTime' },
        },
      },
      {
        $addFields: { duration: { $subtract: ['$endTime', '$startTime'] } },
      },
      {
        $group: {
          _id: '$_id.player',
          game: {
            $top: {
              sortBy: { totalWave: -1, duration: 1 },
              output: {
                gameId: '$_id.gameId',
                totalWave: '$totalWave',
                startTime: '$startTime',
                endTime: '$endTime',
                duration: '$duration',
              },
            },
          },
        },
      },
      {
        $sort: {
          'game.totalWave': -1,
          'game.duration': 1,
        },
      },
      {
        $limit: 50,
      },
      {
        $lookup: {
          from: 'players',
          localField: '_id',
          foreignField: '_id',
          as: 'player',
        },
      },
      {
        $unwind: '$player',
      },
      {
        $project: {
          _id: 0,
          player: {
            address: '$player.address',
            username: '$player.username',
          },
          gameId: '$game.gameId',
          totalWave: '$game.totalWave',
          startTime: '$game.startTime',
          endTime: '$game.endTime',
          duration: '$game.duration',
        },
      },
    ]);

    return leaderboard;
  }

  async getCurrentRankByWalletAddress(query: GetCurrentRankDto) {
    const { seasonId, walletAddress } = query;

    const seasonObjectId = new Types.ObjectId(seasonId);
    const seasonDocument = await this.seasonModel.findById(seasonObjectId);
    if (!seasonDocument) {
      throw new HttpException('Season not found', HttpStatus.NOT_FOUND);
    }

    const player = await this.playerService.getOrCreeatePlayer(walletAddress);

    const playerId = player._id;

    const leaderboard = await this.playerProgressModel.aggregate([
      {
        $match: {
          season: seasonObjectId,
          isCompleted: true,
        },
      },
      {
        $group: {
          _id: {
            player: '$player',
            gameId: '$gameId',
          },
          totalWave: { $sum: 1 },
          startTime: { $first: '$startTime' },
          endTime: { $last: '$endTime' },
        },
      },
      {
        $addFields: {
          duration: { $subtract: ['$endTime', '$startTime'] },
        },
      },
      {
        $sort: {
          '_id.player': 1,
          totalWave: -1,
          duration: 1,
        },
      },
      {
        $group: {
          _id: '$_id.player',
          bestGame: { $first: '$$ROOT' },
        },
      },
      {
        $sort: {
          'bestGame.totalWave': -1,
          'bestGame.duration': 1,
        },
      },
      {
        $sort: {
          'bestGame.totalWave': -1,
          'bestGame.duration': 1,
        },
      },
      // Then assign ranks using only one field (e.g., totalWave)
      {
        $setWindowFields: {
          sortBy: { 'bestGame.totalWave': -1 }, // Only one field allowed here
          output: {
            rank: { $documentNumber: {} },
          },
        },
      },
      {
        $match: {
          _id: playerId,
        },
      },
      {
        $lookup: {
          from: 'players',
          localField: '_id',
          foreignField: '_id',
          as: 'playerInfo',
        },
      },
      {
        $unwind: '$playerInfo',
      },
      {
        $project: {
          _id: 0,
          rank: 1,
          player: {
            address: '$playerInfo.address',
            username: '$playerInfo.username',
          },
          gameId: '$bestGame._id.gameId',
          totalWave: '$bestGame.totalWave',
          startTime: '$bestGame.startTime',
          endTime: '$bestGame.endTime',
          duration: '$bestGame.duration',
        },
      },
    ]);

    if (leaderboard.length === 0) {
      return {
        rank: null,
        player: {
          address: player.address,
          username: player.username,
        },
        message:
          'Player is not ranked for this season (no completed games or did not meet criteria).',
      };
    }

    return leaderboard[0];
  }
}
