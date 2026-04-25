import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  /** LINE userId — null until admin links it */
  @Column({ name: 'line_user_id', nullable: true, unique: true })
  lineUserId: string | null;

  /** Phone number — primary key from external system A */
  @Column({ unique: true })
  phone: string;

  /** Customer's real name from external system A */
  @Column({ nullable: true })
  name: string | null;

  /** Cached from LINE API after linking */
  @Column({ name: 'line_display_name', nullable: true })
  lineDisplayName: string | null;

  /** Admin free-text note */
  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
