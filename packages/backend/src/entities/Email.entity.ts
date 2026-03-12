import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  OneToMany,
  type Relation
} from 'typeorm'
import { Todo } from './Todo.entity'
import { Label } from './Label.entity'

/**
 * Process status values for email workflow
 */
export type ProcessStatus = 'PENDING' | 'QUEUED' | 'PROCESSING' | 'PROCESSED' | 'FAILED'

@Entity('emails')
@Index(['date'])
@Index(['isProcessed'])
@Index(['sender'])
@Index(['message_id'])
@Index(['uid'])
@Index(['process_status'])
export class Email {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @Column({ type: 'varchar', length: 500, nullable: true })
  subject!: string | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  sender!: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  snippet!: string | null

  @Column({ type: 'text', nullable: true })
  bodyText!: string | null

  @Column({ type: 'varchar', length: 500, nullable: true })
  summary!: string | null

  @Column({ type: 'boolean', default: false })
  hasAttachments!: boolean

  @Column({ type: 'datetime' })
  date!: Date

  @Column({ type: 'boolean', default: false })
  isProcessed!: boolean

  @Column({ type: 'boolean', default: false })
  isSpam!: boolean

  // Thread context fields for email threading/conversation grouping
  @Column({ type: 'varchar', length: 500, nullable: true, unique: true })
  message_id!: string | null

  @Column({ type: 'varchar', length: 500, nullable: true })
  in_reply_to!: string | null

  @Column({ type: 'simple-json', nullable: true })
  references!: string[] | null

  // IMAP UID for sync tracking
  @Column({ type: 'integer', nullable: true })
  uid!: number | null

  // Process status for AI pipeline workflow
  @Column({
    type: 'varchar',
    length: 20,
    default: 'PENDING'
  })
  process_status: ProcessStatus = 'PENDING'

  @OneToMany(() => Todo, (todo) => todo.email)
  todos!: Relation<Todo[]>

  @OneToMany(() => Label, (label) => label.email)
  labels!: Relation<Label[]>
}