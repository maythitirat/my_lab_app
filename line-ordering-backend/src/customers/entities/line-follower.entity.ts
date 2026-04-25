import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

@Entity('line_followers')
export class LineFollower {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'line_user_id', unique: true })
  lineUserId: string;

  @Column({ name: 'display_name', nullable: true })
  displayName: string | null;

  @Column({ name: 'picture_url', type: 'text', nullable: true })
  pictureUrl: string | null;

  @Column({ name: 'last_seen_at', type: 'timestamptz', default: () => 'NOW()' })
  lastSeenAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
